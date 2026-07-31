import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { DELIVERY_ZONES, RESTAURANT } from '../data/delivery';
import { pln } from '../lib/format';
import QtyStepper from './QtyStepper';
import SafeImage from './SafeImage';

export default function CartDrawer() {
  const {
    items,
    itemCount,
    isOpen,
    closeCart,
    increment,
    decrement,
    remove,
    clear,
    totals,
    fulfillment,
    setFulfillment,
    zoneName,
    setZoneName,
  } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  const blockedByMin = fulfillment === 'delivery' && totals.missingToMin > 0 && Boolean(zoneName);
  const needsZone = fulfillment === 'delivery' && !zoneName;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Twój koszyk">
      <button
        type="button"
        className="absolute inset-0 bg-black/65"
        onClick={closeCart}
        aria-label="Zamknij koszyk"
      />

      <div className="animate-sheet absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-lg border-t border-ink-600 bg-ink-900 md:inset-y-0 md:left-auto md:right-0 md:w-[430px] md:max-h-none md:rounded-none md:border-l md:border-t-0">
        {/* header */}
        <div className="flex items-center justify-between gap-3 border-b border-ink-600 px-4 py-4">
          <div>
            <h2 className="display text-2xl leading-none">Twój koszyk</h2>
            <p className="mt-1 text-[13px] text-cream/50">
              {itemCount > 0 ? `${itemCount} poz. · ${pln(totals.subtotal)}` : 'Koszyk jest pusty'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="grid h-10 w-10 place-items-center rounded-lg border border-ink-600 text-xl text-cream/70 hover:text-cream"
            aria-label="Zamknij"
          >
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <EmptyState onClose={closeCart} />
        ) : (
          <>
            {/* pozycje */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <ul className="space-y-3">
                {items.map((item, i) => (
                  <li
                    key={item.id}
                    className="item-in card flex gap-3 p-2.5"
                    style={{ animationDelay: `${Math.min(i * 45, 300)}ms` }}
                  >
                    <SafeImage
                      src={item.image}
                      alt={item.name}
                      ratio="square"
                      className="w-[72px] shrink-0 rounded-md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[14px] font-bold leading-snug clamp-2">{item.name}</p>
                        <button
                          type="button"
                          onClick={() => remove(item.id)}
                          className="shrink-0 text-[12px] font-semibold text-cream/40 underline hover:text-fire-400"
                        >
                          Usuń
                        </button>
                      </div>
                      <p className="mt-0.5 text-[12px] text-cream/45">
                        {pln(item.price)} {item.portion ? `· ${item.portion}` : ''}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <QtyStepper
                          quantity={item.quantity}
                          onIncrement={() => increment(item.id)}
                          onDecrement={() => decrement(item.id)}
                          label={item.name}
                        />
                        <span className="whitespace-nowrap text-[15px] font-bold tabular-nums">
                          {pln(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={clear}
                className="mt-3 text-[13px] font-semibold text-cream/40 underline hover:text-cream/70"
              >
                Wyczyść koszyk
              </button>
            </div>

            {/* podsumowanie */}
            <div className="safe-bottom border-t border-ink-600 bg-ink-800 px-4 pt-4">
              <p className="label">Dostawa czy odbiór?</p>
              <div className="mb-3 grid grid-cols-2 gap-2">
                {(['delivery', 'pickup'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFulfillment(type)}
                    className={`min-h-[44px] rounded-lg border px-3 text-[14px] font-semibold transition ${
                      fulfillment === type
                        ? 'border-fire-500 bg-fire-500/12 text-cream'
                        : 'border-ink-600 text-cream/60 hover:border-cream/40'
                    }`}
                  >
                    {type === 'delivery' ? 'Dostawa' : `Odbiór −${RESTAURANT.pickupDiscount}%`}
                  </button>
                ))}
              </div>

              {fulfillment === 'delivery' && (
                <div className="mb-3">
                  <label className="label" htmlFor="drawer-zone">
                    Dzielnica
                  </label>
                  <select
                    id="drawer-zone"
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                  >
                    <option value="">Wybierz dzielnicę…</option>
                    {DELIVERY_ZONES.map((z) => (
                      <option key={z.name} value={z.name}>
                        {z.name} — {pln(z.fee)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <dl className="space-y-1.5 text-[14px]">
                <Row label="Suma częściowa" value={pln(totals.subtotal)} />
                {totals.discount > 0 && (
                  <Row
                    label={totals.discountLabel ?? 'Rabat'}
                    value={`−${pln(totals.discount)}`}
                    accent
                  />
                )}
                <Row
                  label="Dostawa"
                  value={
                    fulfillment === 'pickup'
                      ? 'Odbiór osobisty'
                      : totals.deliveryFee === null
                        ? 'wybierz dzielnicę'
                        : totals.freeDelivery
                          ? 'Darmowa'
                          : pln(totals.deliveryFee)
                  }
                />
                <div className="flex items-baseline justify-between border-t border-ink-600 pt-2.5">
                  <dt className="display text-lg">Razem</dt>
                  <dd className="display text-3xl leading-none">{pln(totals.total)}</dd>
                </div>
              </dl>

              {totals.missingToFree !== null && !blockedByMin && (
                <p className="mt-2.5 rounded-lg bg-gold/12 px-3 py-2 text-[13px] font-semibold text-gold">
                  Dodaj jeszcze {pln(totals.missingToFree)} — darmowa dostawa
                </p>
              )}

              {blockedByMin && (
                <p className="mt-2.5 rounded-lg bg-fire-500/12 px-3 py-2 text-[13px] font-semibold text-fire-400">
                  Minimum dla tej dzielnicy to {pln(totals.minOrder)}. Brakuje{' '}
                  {pln(totals.missingToMin)}.
                </p>
              )}

              <button
                type="button"
                className="btn-primary mt-3 w-full"
                disabled={blockedByMin}
                onClick={() => {
                  closeCart();
                  navigate('/zamowienie');
                }}
              >
                {needsZone ? 'Przejdź do zamówienia' : 'Złóż zamówienie'} · {pln(totals.total)}
              </button>

              <button
                type="button"
                onClick={closeCart}
                className="mb-1 mt-2 w-full py-2.5 text-[14px] font-semibold text-cream/55 hover:text-cream"
              >
                Kupuję dalej
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={`min-w-0 ${accent ? 'text-emerald-400' : 'text-cream/60'}`}>{label}</dt>
      <dd className={`whitespace-nowrap font-semibold tabular-nums ${accent ? 'text-emerald-400' : ''}`}>
        {value}
      </dd>
    </div>
  );
}

function EmptyState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-14 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-ink-500 text-2xl">
        🥢
      </div>
      <div>
        <p className="display text-xl">Koszyk jest pusty</p>
        <p className="mx-auto mt-1.5 max-w-[280px] text-[14px] leading-relaxed text-cream/55">
          Wybierz zestaw albo ulubione rolki — dowozimy w Szczecinie w 40–60 minut.
        </p>
      </div>
      <Link to="/menu" className="btn-primary w-full max-w-[280px]" onClick={onClose}>
        Zobacz menu
      </Link>
    </div>
  );
}
