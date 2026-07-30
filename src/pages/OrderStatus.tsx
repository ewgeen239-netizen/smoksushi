import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { RESTAURANT } from '../data/delivery';
import { pln } from '../lib/format';
import { ApiFailure, createPaymentSession, fetchOrder } from '../lib/api';
import { STORAGE_KEYS, readJson, writeJson, type PendingOrderRef } from '../lib/storage';
import {
  isOnlinePayment,
  paymentMethodInfo,
  PAYMENT_STATUS_LABEL,
  type Order,
} from '../shared/payments';

type View = 'loading' | 'error' | 'ready';

const POLL_MS = 2500;
const POLL_LIMIT = 16; // ~40 s czekania na webhook

export default function OrderStatus() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { awardOrder } = useCart();

  const queryOrderId = params.get('orderId');
  const cancelledHint = params.get('cancelled') === '1';

  const [view, setView] = useState<View>('loading');
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string>('');
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const ref = useRef<PendingOrderRef | null>(null);
  const pollCount = useRef(0);
  const awarded = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  // rozwiąż token dostępu: z query (orderId) + storage
  if (!ref.current) {
    const stored = readJson<PendingOrderRef | null>(STORAGE_KEYS.pendingOrder, null);
    if (stored && (!queryOrderId || stored.orderId === queryOrderId)) ref.current = stored;
  }

  const isTerminal = (o: Order) =>
    !isOnlinePayment(o.paymentMethod) ||
    o.paymentStatus === 'paid' ||
    o.paymentStatus === 'failed' ||
    o.paymentStatus === 'cancelled';

  const load = useCallback(async () => {
    if (!ref.current) {
      setError('Nie znaleźliśmy danych zamówienia. Sprawdź je telefonicznie w restauracji.');
      setView('error');
      return;
    }
    try {
      const { order: fresh } = await fetchOrder(ref.current.orderId, ref.current.accessToken);
      setOrder(fresh);
      setView('ready');

      // punkty klubu tylko po realnym potwierdzeniu (paid) lub przy płatności przy odbiorze
      const settled = fresh.paymentStatus === 'paid' || !isOnlinePayment(fresh.paymentMethod);
      if (settled && !awarded.current) {
        awarded.current = true;
        awardOrder(fresh);
      }

      // kontynuuj polling dopóki online-płatność jest w toku
      if (!isTerminal(fresh) && pollCount.current < POLL_LIMIT) {
        pollCount.current += 1;
        timer.current = window.setTimeout(load, POLL_MS);
      }
    } catch (err) {
      const message =
        err instanceof ApiFailure
          ? err.body.message ?? 'Nie udało się pobrać statusu zamówienia.'
          : 'Brak połączenia z serwerem.';
      setError(message);
      setView('error');
    }
  }, [awardOrder]);

  useEffect(() => {
    void load();
    return () => window.clearTimeout(timer.current);
  }, [load]);

  const retryPayment = async () => {
    if (!ref.current) return;
    setRetrying(true);
    setRetryError(null);
    try {
      const { session } = await createPaymentSession(ref.current.orderId, ref.current.accessToken);
      // odśwież token (ten sam) i przekieruj do operatora
      writeJson(STORAGE_KEYS.pendingOrder, ref.current);
      window.location.assign(session.redirectUrl);
    } catch (err) {
      setRetrying(false);
      setRetryError(
        err instanceof ApiFailure
          ? err.body.message ?? 'Nie udało się rozpocząć płatności.'
          : 'Brak połączenia z operatorem płatności.',
      );
    }
  };

  if (view === 'loading') {
    return (
      <StatusShell>
        <Spinner />
        <h1 className="display mt-4 text-2xl">Sprawdzamy status płatności…</h1>
        <p className="mt-2 text-[14px] text-cream/55">To potrwa chwilę.</p>
      </StatusShell>
    );
  }

  if (view === 'error' || !order) {
    return (
      <StatusShell>
        <Badge tone="neutral">!</Badge>
        <h1 className="display mt-4 text-2xl">Nie znaleźliśmy zamówienia</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-cream/60">{error}</p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link to="/menu" className="btn-primary">
            Wróć do menu
          </Link>
          <a href={RESTAURANT.phoneHref} className="btn-ghost">
            {RESTAURANT.phone}
          </a>
        </div>
      </StatusShell>
    );
  }

  const online = isOnlinePayment(order.paymentMethod);
  const status = order.paymentStatus;

  // ─────────────── SUKCES: opłacone online albo płatność przy odbiorze
  if (status === 'paid' || (!online && order.status === 'confirmed')) {
    return <OrderSuccessView order={order} paidOnline={status === 'paid'} onReorder={() => navigate('/')} />;
  }

  // ─────────────── W TOKU: zamówienie utworzone, czekamy na potwierdzenie operatora
  if (status === 'pending') {
    return (
      <StatusShell wide>
        <Spinner />
        <h1 className="display mt-4 text-2xl sm:text-3xl">Czekamy na potwierdzenie płatności</h1>
        <p className="mx-auto mt-2 max-w-[420px] text-[14px] leading-relaxed text-cream/60">
          Zamówienie <strong className="text-cream">{order.id}</strong> zostało zapisane. Gdy
          operator potwierdzi płatność, ta strona zaktualizuje się automatycznie. Nie zamykaj jej.
        </p>
        <OrderMiniSummary order={order} />
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button type="button" className="btn-ghost" onClick={retryPayment} disabled={retrying}>
            {retrying ? 'Otwieramy…' : 'Zapłać ponownie'}
          </button>
          <a href={RESTAURANT.phoneHref} className="btn-ghost">
            {RESTAURANT.phone}
          </a>
        </div>
        {retryError && <p className="mt-3 text-[13px] font-medium text-fire-400">{retryError}</p>}
      </StatusShell>
    );
  }

  // ─────────────── NIEUDANE / ANULOWANE: pokaż powód + „Spróbuj ponownie”
  const cancelled = status === 'cancelled' || cancelledHint;
  return (
    <StatusShell wide>
      <Badge tone="fire">✕</Badge>
      <h1 className="display mt-4 text-2xl sm:text-3xl">
        {cancelled ? 'Płatność anulowana' : 'Płatność nie powiodła się'}
      </h1>
      <p className="mx-auto mt-2 max-w-[440px] text-[14px] leading-relaxed text-cream/60">
        {order.failureReason ??
          (cancelled
            ? 'Płatność została przerwana. Twoje zamówienie czeka — możesz spróbować ponownie.'
            : 'Bank odrzucił transakcję. Nic nie pobraliśmy. Spróbuj ponownie lub wybierz inną metodę.')}
      </p>
      <p className="mt-3 text-[13px] text-cream/45">
        Zamówienie <strong className="text-cream">{order.id}</strong> · {PAYMENT_STATUS_LABEL[status]}
      </p>
      <OrderMiniSummary order={order} />
      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        <button type="button" className="btn-primary" onClick={retryPayment} disabled={retrying}>
          {retrying ? 'Otwieramy płatność…' : 'Spróbuj ponownie'}
        </button>
        <Link to="/zamowienie" className="btn-ghost">
          Zmień zamówienie
        </Link>
      </div>
      {retryError && <p className="mt-3 text-[13px] font-medium text-fire-400">{retryError}</p>}
    </StatusShell>
  );
}

/* ─────────────────────────── widoki pomocnicze */

function StatusShell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="shell py-12 sm:py-16">
      <div
        className={`card mx-auto px-5 py-9 text-center sm:px-8 ${wide ? 'max-w-[560px]' : 'max-w-[460px]'}`}
      >
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div
      className="mx-auto h-12 w-12 animate-spin rounded-full border-[3px] border-ink-500 border-t-fire-500"
      role="status"
      aria-label="Ładowanie"
    />
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'fire' | 'neutral' }) {
  const cls =
    tone === 'fire'
      ? 'bg-fire-500 text-white'
      : 'border-2 border-dashed border-ink-500 text-cream/70';
  return (
    <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl font-bold ${cls}`}>
      {children}
    </div>
  );
}

function OrderMiniSummary({ order }: { order: Order }) {
  return (
    <dl className="mx-auto mt-6 max-w-[360px] space-y-2 text-left text-[14px]">
      <MiniRow label="Metoda płatności" value={paymentMethodInfo(order.paymentMethod).label} />
      <MiniRow label="Pozycje" value={`${order.items.reduce((n, i) => n + i.quantity, 0)}`} />
      <MiniRow label="Do zapłaty" value={pln(order.total)} bold />
    </dl>
  );
}

function MiniRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/8 pb-2 last:border-0">
      <dt className="text-cream/50">{label}</dt>
      <dd className={`tabular-nums ${bold ? 'display text-lg' : 'font-semibold'}`}>{value}</dd>
    </div>
  );
}

function OrderSuccessView({
  order,
  paidOnline,
  onReorder,
}: {
  order: Order;
  paidOnline: boolean;
  onReorder: () => void;
}) {
  const isDelivery = order.fulfillmentType === 'delivery';
  const method = paymentMethodInfo(order.paymentMethod);
  return (
    <div className="shell py-10 sm:py-16">
      <div className="card mx-auto max-w-[640px] overflow-hidden">
        <div className="border-b border-ink-600 bg-emerald-500/10 px-5 py-7 text-center sm:px-8">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-2xl font-bold text-ink-900">
            ✓
          </div>
          <h1 className="display mt-4 text-3xl leading-tight sm:text-4xl">
            {paidOnline ? 'Płatność potwierdzona!' : 'Dziękujemy za zamówienie!'}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-cream/70">
            {paidOnline ? (
              <>
                Otrzymaliśmy płatność. Zadzwonimy lub wyślemy SMS na numer{' '}
                <strong>{order.customer.phone}</strong>, gdy zamówienie ruszy do przygotowania.
              </>
            ) : (
              <>
                Zadzwonimy lub wyślemy SMS na numer <strong>{order.customer.phone}</strong>, żeby
                potwierdzić zamówienie. Płatność {method.label.toLowerCase()}.
              </>
            )}
          </p>
          <p className="mt-4 inline-block rounded-lg border border-dashed border-cream/30 px-4 py-2 font-mono text-lg font-bold">
            {order.id}
          </p>
          <p className="mt-2 text-[13px] font-semibold text-emerald-400">
            {paidOnline ? 'Zapłacono' : PAYMENT_STATUS_LABEL[order.paymentStatus]} ·{' '}
            {method.label}
          </p>
        </div>

        <div className="px-5 py-5 sm:px-8">
          <dl className="space-y-2.5 text-[14px]">
            <SummaryRow label="Sposób realizacji" value={isDelivery ? 'Dostawa' : 'Odbiór osobisty'} />
            {isDelivery ? (
              <>
                <SummaryRow label="Adres" value={order.customer.address ?? '—'} />
                <SummaryRow label="Dzielnica" value={order.customer.zone ?? '—'} />
              </>
            ) : (
              <>
                <SummaryRow
                  label="Miejsce odbioru"
                  value={`${RESTAURANT.street}, ${RESTAURANT.city}`}
                />
                <SummaryRow
                  label="Godzina odbioru"
                  value={
                    order.customer.pickupTime === 'asap'
                      ? 'Jak najszybciej'
                      : (order.customer.pickupTime ?? '—')
                  }
                />
              </>
            )}
            <SummaryRow label="Zamawiający" value={`${order.customer.name}, ${order.customer.phone}`} />
          </dl>

          <ul className="mt-5 divide-y divide-white/8 border-y border-white/8">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-3 py-2.5">
                <span className="min-w-0 text-[14px] text-cream/75">
                  {item.quantity}× {item.name}
                </span>
                <span className="shrink-0 whitespace-nowrap text-[14px] font-semibold tabular-nums">
                  {pln(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-baseline justify-between">
            <span className="display text-xl">{paidOnline ? 'Zapłacono' : 'Do zapłaty'}</span>
            <span className="display text-3xl leading-none">{pln(order.total)}</span>
          </div>
          {order.deliveryFee > 0 && (
            <p className="mt-1 text-right text-[13px] text-cream/45">
              w tym dostawa {pln(order.deliveryFee)}
            </p>
          )}

          <div className="mt-6 rounded-lg border border-gold/30 bg-gold/[0.07] p-3.5">
            <p className="text-[14px] font-semibold text-gold">
              +{Math.floor(order.total / 10)} pkt w Smok Club
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-cream/60">
              Punkty dopisaliśmy do Twojego konta. Zbierz 10 zamówień i odbierz rabat na kolejne.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <Link to="/menu" className="btn-primary w-full sm:w-auto" onClick={onReorder}>
              Zamów coś jeszcze
            </Link>
            <a href={RESTAURANT.phoneHref} className="btn-ghost w-full sm:w-auto">
              Zadzwoń: {RESTAURANT.phone}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
      <dt className="text-cream/50">{label}</dt>
      <dd className="max-w-full break-words text-right font-semibold">{value}</dd>
    </div>
  );
}
