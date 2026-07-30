import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import QtyStepper from '../components/QtyStepper';
import SafeImage from '../components/SafeImage';
import { useCart } from '../context/CartContext';
import { DELIVERY_ZONES, PICKUP_SLOTS, RESTAURANT } from '../data/delivery';
import { isValidEmail, isValidPhone, pln } from '../lib/format';
import { STORAGE_KEYS, readJson, writeJson } from '../lib/storage';
import { ApiFailure, createOrder, createPaymentSession } from '../lib/api';
import {
  describeMethod,
  isOnlinePayment,
  methodsFor,
  type CreateOrderPayload,
  type PaymentMethod,
} from '../shared/payments';

type ErrorKey =
  | 'name'
  | 'phone'
  | 'email'
  | 'address'
  | 'zone'
  | 'pickupTime'
  | 'consent'
  | 'paymentMethod'
  | 'items'
  | 'min';
type Errors = Partial<Record<ErrorKey, string>>;

type SavedCustomer = {
  name: string;
  phone: string;
  email: string;
  address: string;
};

type Phase = 'form' | 'submitting' | 'redirecting';

export default function Checkout() {
  const {
    items,
    itemCount,
    totals,
    increment,
    decrement,
    remove,
    fulfillment,
    setFulfillment,
    zoneName,
    setZoneName,
    promoCode,
    applyPromo,
    clearPromo,
    commitOrder,
    awardOrder,
  } = useCart();
  const navigate = useNavigate();

  const saved = useMemo(
    () =>
      readJson<SavedCustomer>(STORAGE_KEYS.customer, {
        name: '',
        phone: '',
        email: '',
        address: '',
      }),
    [],
  );

  const [name, setName] = useState(saved.name);
  const [phone, setPhone] = useState(saved.phone);
  const [email, setEmail] = useState(saved.email);
  const [address, setAddress] = useState(saved.address);
  const [courierNote, setCourierNote] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [codeInput, setCodeInput] = useState('');
  const [codeMessage, setCodeMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [phase, setPhase] = useState<Phase>('form');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isDelivery = fulfillment === 'delivery';
  const availableMethods = methodsFor(fulfillment);
  const online = payment ? isOnlinePayment(payment) : false;
  const busy = phase !== 'form';

  useEffect(() => {
    if (phase === 'form') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [phase]);

  const validate = (): Errors => {
    const next: Errors = {};
    if (name.trim().length < 2) next.name = 'Podaj imię (min. 2 znaki).';
    if (!isValidPhone(phone)) next.phone = 'Podaj numer w formacie 880 503 760 lub +48880503760.';
    if (email.trim() && !isValidEmail(email)) next.email = 'Ten e-mail wygląda na niepoprawny.';

    if (isDelivery) {
      if (!zoneName) next.zone = 'Wybierz dzielnicę, żeby policzyć dostawę.';
      if (address.trim().length < 5) next.address = 'Podaj ulicę, numer domu i mieszkania.';
      if (zoneName && totals.missingToMin > 0) {
        next.min = `Minimum dla tej dzielnicy to ${pln(totals.minOrder)}. Brakuje ${pln(
          totals.missingToMin,
        )}.`;
      }
    } else if (!pickupTime) {
      next.pickupTime = 'Wybierz godzinę odbioru.';
    }

    if (!payment) next.paymentMethod = 'Wybierz sposób płatności.';
    if (!consent) next.consent = 'Potrzebujemy zgody na kontakt w sprawie zamówienia.';
    return next;
  };

  const scrollToFirst = (found: Errors) => {
    const firstKey = Object.keys(found)[0];
    document.getElementById(`field-${firstKey}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0 || !payment) {
      scrollToFirst(found);
      return;
    }

    writeJson(STORAGE_KEYS.customer, {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
    } satisfies SavedCustomer);

    const payload: CreateOrderPayload = {
      items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
      fulfillmentType: fulfillment,
      paymentMethod: payment,
      promoCode: promoCode ?? null,
      customer: {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: isDelivery ? address.trim() : undefined,
        zone: isDelivery ? zoneName : undefined,
        courierNote: courierNote.trim() || undefined,
        pickupTime: !isDelivery ? pickupTime : undefined,
        consent,
      },
    };

    setPhase('submitting');
    try {
      const { order, accessToken, requiresPayment } = await createOrder(payload);
      // koszyk trafił na serwer jako snapshot — czyścimy lokalny
      commitOrder(order);
      writeJson(STORAGE_KEYS.pendingOrder, { orderId: order.id, accessToken });

      if (!requiresPayment) {
        // gotówka / karta przy odbiorze — zamówienie od razu potwierdzone
        awardOrder(order);
        navigate(`/zamowienie/status?orderId=${encodeURIComponent(order.id)}`);
        return;
      }

      // płatność online — sesja u operatora i przekierowanie na secure checkout
      setPhase('redirecting');
      const { session } = await createPaymentSession(order.id, accessToken);
      window.location.assign(session.redirectUrl);
    } catch (err) {
      setPhase('form');
      if (err instanceof ApiFailure && err.body.fields) {
        const mapped = mapServerFields(err.body.fields);
        setErrors(mapped);
        scrollToFirst(mapped);
        return;
      }
      setSubmitError(
        err instanceof ApiFailure
          ? err.body.message ?? 'Nie udało się złożyć zamówienia.'
          : 'Brak połączenia z serwerem. Spróbuj ponownie.',
      );
    }
  };

  if (phase === 'redirecting') {
    return (
      <div className="shell py-16">
        <div className="card mx-auto max-w-[460px] px-6 py-10 text-center">
          <div
            className="mx-auto h-12 w-12 animate-spin rounded-full border-[3px] border-ink-500 border-t-fire-500"
            role="status"
            aria-label="Przekierowanie"
          />
          <h1 className="display mt-4 text-2xl">Przekierowujemy do płatności…</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-cream/60">
            Za chwilę otworzy się bezpieczna strona operatora. Nie zamykaj przeglądarki.
          </p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="shell py-16">
        <div className="card mx-auto max-w-[520px] px-6 py-12 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-ink-500 text-2xl">
            🥢
          </div>
          <h1 className="display mt-4 text-3xl">Koszyk jest pusty</h1>
          <p className="mx-auto mt-2 max-w-[340px] text-[15px] leading-relaxed text-cream/60">
            Dodaj coś z menu, a potem wróć tutaj — zamówienie zajmie mniej niż 2 minuty.
          </p>
          <Link to="/menu" className="btn-primary mt-6 w-full sm:w-auto sm:px-8">
            Przejdź do menu
          </Link>
        </div>
      </div>
    );
  }

  const err = (key: ErrorKey) => errors[key];

  return (
    <div className="shell py-7 pb-16">
      <nav className="mb-4 text-[13px] text-cream/45">
        <Link to="/" className="hover:text-cream">
          Start
        </Link>{' '}
        / <Link to="/menu" className="hover:text-cream">Menu</Link> /{' '}
        <span className="text-cream/80">Zamówienie</span>
      </nav>

      <h1 className="display text-4xl leading-none sm:text-5xl">Zamówienie</h1>
      <p className="mt-2 text-[15px] text-cream/60">
        {itemCount} poz. · potwierdzamy telefonicznie w ciągu kilku minut.
      </p>

      <form onSubmit={submit} noValidate className="mt-6 grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* ───────── FORMULARZ */}
        <div className="space-y-4">
          {/* dane */}
          <fieldset className="card p-4 sm:p-5">
            <legend className="display px-1 text-xl">Twoje dane</legend>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div id="field-name">
                <label className="label" htmlFor="name">
                  Imię *
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="given-name"
                  placeholder="Anna"
                  aria-invalid={Boolean(err('name'))}
                />
                {err('name') && <p className="field-error">{err('name')}</p>}
              </div>
              <div id="field-phone">
                <label className="label" htmlFor="phone">
                  Telefon *
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  placeholder="880 503 760"
                  aria-invalid={Boolean(err('phone'))}
                />
                {err('phone') && <p className="field-error">{err('phone')}</p>}
              </div>
              <div className="sm:col-span-2" id="field-email">
                <label className="label" htmlFor="email">
                  E-mail (opcjonalnie)
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="anna@example.com"
                  aria-invalid={Boolean(err('email'))}
                />
                {err('email') ? (
                  <p className="field-error">{err('email')}</p>
                ) : (
                  <p className="mt-1.5 text-[12px] text-cream/40">
                    Wyślemy potwierdzenie i punkty Smok Club.
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          {/* sposób odbioru */}
          <fieldset className="card p-4 sm:p-5">
            <legend className="display px-1 text-xl">Dostawa czy odbiór?</legend>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <OptionCard
                active={isDelivery}
                onClick={() => setFulfillment('delivery')}
                title="Dostawa"
                text="Kurier pod wskazany adres, 40–60 min."
              />
              <OptionCard
                active={!isDelivery}
                onClick={() => setFulfillment('pickup')}
                title={`Odbiór osobisty −${RESTAURANT.pickupDiscount}%`}
                text={`${RESTAURANT.street} · gotowe w 20–30 min.`}
              />
            </div>

            {isDelivery ? (
              <div className="mt-4 grid gap-4">
                <div id="field-zone">
                  <label className="label" htmlFor="zone">
                    Dzielnica *
                  </label>
                  <select
                    id="zone"
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    aria-invalid={Boolean(err('zone'))}
                  >
                    <option value="">Wybierz dzielnicę…</option>
                    {DELIVERY_ZONES.map((z) => (
                      <option key={z.name} value={z.name}>
                        {z.name} — min. {z.minOrder} zł, dostawa {z.fee} zł
                      </option>
                    ))}
                  </select>
                  {err('zone') && <p className="field-error">{err('zone')}</p>}
                  {zoneName && (
                    <p className="mt-2 rounded-lg bg-ink-700 px-3 py-2 text-[13px] text-cream/70">
                      Minimalna wartość zamówienia:{' '}
                      <strong className="text-cream">{pln(totals.minOrder)}</strong>
                      {' · '}
                      {totals.freeDelivery ? (
                        <strong className="text-emerald-400">dostawa darmowa</strong>
                      ) : (
                        <>
                          dostawa <strong className="text-cream">{pln(totals.deliveryFee ?? 0)}</strong>
                        </>
                      )}
                      {totals.missingToFree !== null && (
                        <> · darmowa od {pln(totals.missingToFree + totals.subtotal)}</>
                      )}
                      {totals.eta && <> · czas {totals.eta}</>}
                    </p>
                  )}
                </div>

                <div id="field-address">
                  <label className="label" htmlFor="address">
                    Adres *
                  </label>
                  <input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    autoComplete="street-address"
                    placeholder="ul. Wojska Polskiego 12/4"
                    aria-invalid={Boolean(err('address'))}
                  />
                  {err('address') && <p className="field-error">{err('address')}</p>}
                </div>

                <div>
                  <label className="label" htmlFor="note">
                    Komentarz dla kuriera
                  </label>
                  <textarea
                    id="note"
                    rows={3}
                    value={courierNote}
                    onChange={(e) => setCourierNote(e.target.value)}
                    placeholder="Kod do klatki, piętro, zadzwoń przed przyjazdem…"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-4">
                <div className="rounded-lg border border-ink-600 bg-ink-700 p-3.5">
                  <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-cream/45">
                    Odbierasz tutaj
                  </p>
                  <p className="display mt-1 text-2xl leading-tight">{RESTAURANT.street}</p>
                  <p className="mt-0.5 text-[14px] text-cream/60">{RESTAURANT.city}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-cream/60">
                    {RESTAURANT.hours.map((h) => (
                      <span key={h.days}>
                        {h.days}: <strong className="text-cream">{h.time}</strong>
                      </span>
                    ))}
                  </div>
                  <a
                    href={RESTAURANT.phoneHref}
                    className="mt-2.5 inline-block text-[14px] font-bold text-fire-400"
                  >
                    {RESTAURANT.phone}
                  </a>
                </div>

                <div id="field-pickupTime">
                  <label className="label" htmlFor="pickup">
                    Godzina odbioru *
                  </label>
                  <select
                    id="pickup"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    aria-invalid={Boolean(err('pickupTime'))}
                  >
                    <option value="">Wybierz godzinę…</option>
                    <option value="asap">Jak najszybciej (20–30 min)</option>
                    {PICKUP_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  {err('pickupTime') && <p className="field-error">{err('pickupTime')}</p>}
                </div>
              </div>
            )}
          </fieldset>

          {/* płatność */}
          <fieldset id="field-paymentMethod" className="card p-4 sm:p-5">
            <legend className="display px-1 text-xl">Płatność</legend>
            <p className="mt-1 px-1 text-[13px] text-cream/50">
              Dane karty i BLIK wpisujesz na bezpiecznej stronie operatora — nie przechowujemy ich
              u siebie.
            </p>
            <div className="mt-3 grid gap-2" role="radiogroup" aria-label="Sposób płatności">
              {availableMethods.map((m) => {
                const active = payment === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setPayment(m.id);
                      setErrors((prev) => ({ ...prev, paymentMethod: undefined }));
                    }}
                    className={`flex items-center gap-3 rounded-lg border p-3.5 text-left transition ${
                      active
                        ? 'border-fire-500 bg-fire-500/10'
                        : 'border-ink-600 hover:border-cream/40'
                    }`}
                  >
                    <span
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                        active ? 'border-fire-500' : 'border-ink-500'
                      }`}
                    >
                      {active && <span className="h-2.5 w-2.5 rounded-full bg-fire-500" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-[15px] font-bold">{m.label}</span>
                        {m.online ? (
                          <span className="rounded-sm bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                            Online
                          </span>
                        ) : (
                          <span className="rounded-sm bg-white/8 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cream/50">
                            Przy odbiorze
                          </span>
                        )}
                        {m.hint && (
                          <span className="text-[12px] text-cream/40">· {m.hint}</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-cream/60">
                        {describeMethod(m, fulfillment)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {err('paymentMethod') && <p className="field-error mt-2">{err('paymentMethod')}</p>}
          </fieldset>

          {/* zgoda */}
          <div id="field-consent" className="card p-4 sm:p-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 !h-5 !w-5 !min-h-0 shrink-0 accent-fire-500"
              />
              <span className="text-[14px] leading-relaxed text-cream/75">
                Zgadzam się na kontakt telefoniczny lub SMS w sprawie realizacji zamówienia i
                akceptuję regulamin oraz politykę prywatności Sushi Smok. *
              </span>
            </label>
            {err('consent') && <p className="field-error">{err('consent')}</p>}
          </div>
        </div>

        {/* ───────── PODSUMOWANIE */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="card overflow-hidden">
            <div className="border-b border-ink-600 px-4 py-3.5">
              <h2 className="display text-xl leading-none">Twoje zamówienie</h2>
            </div>

            <ul className="max-h-[320px] divide-y divide-white/8 overflow-y-auto px-4">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3 py-3">
                  <SafeImage
                    src={item.image}
                    alt={item.name}
                    ratio="square"
                    className="w-14 shrink-0 rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-[14px] font-semibold leading-snug clamp-2">
                        {item.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className="shrink-0 text-[12px] text-cream/40 underline hover:text-fire-400"
                      >
                        Usuń
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <QtyStepper
                        quantity={item.quantity}
                        onIncrement={() => increment(item.id)}
                        onDecrement={() => decrement(item.id)}
                        label={item.name}
                      />
                      <span className="whitespace-nowrap text-[14px] font-bold tabular-nums">
                        {pln(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* kod promocyjny */}
            <div className="border-t border-ink-600 px-4 py-4">
              <label className="label" htmlFor="promo">
                Kod promocyjny
              </label>
              {promoCode ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2.5">
                  <span className="font-mono text-[14px] font-bold">{promoCode}</span>
                  <button
                    type="button"
                    onClick={() => {
                      clearPromo();
                      setCodeMessage(null);
                      setCodeInput('');
                    }}
                    className="text-[12px] font-semibold text-cream/60 underline"
                  >
                    Usuń
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    id="promo"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder="np. SMOK10"
                    className="uppercase"
                  />
                  <button
                    type="button"
                    className="btn-ghost btn-sm !min-h-[48px] shrink-0"
                    onClick={() => {
                      const result = applyPromo(codeInput);
                      setCodeMessage({ ok: result.ok, text: result.message });
                    }}
                  >
                    Użyj
                  </button>
                </div>
              )}
              {codeMessage && !promoCode && (
                <p className={`mt-1.5 text-[13px] font-medium ${codeMessage.ok ? 'text-emerald-400' : 'text-fire-400'}`}>
                  {codeMessage.text}
                </p>
              )}
            </div>

            {/* kwoty */}
            <div className="border-t border-ink-600 bg-ink-800 px-4 py-4">
              <dl className="space-y-1.5 text-[14px]">
                <Row label={`Suma częściowa (${itemCount} poz.)`} value={pln(totals.subtotal)} />
                {totals.discount > 0 && (
                  <Row label={totals.discountLabel ?? 'Rabat'} value={`−${pln(totals.discount)}`} accent />
                )}
                <Row
                  label="Dostawa"
                  value={
                    !isDelivery
                      ? 'Odbiór osobisty'
                      : totals.deliveryFee === null
                        ? 'wybierz dzielnicę'
                        : totals.freeDelivery
                          ? 'Darmowa'
                          : pln(totals.deliveryFee)
                  }
                />
                <div className="flex items-baseline justify-between border-t border-ink-600 pt-2.5">
                  <dt className="display text-lg">Razem do zapłaty</dt>
                  <dd className="display text-3xl leading-none">{pln(totals.total)}</dd>
                </div>
              </dl>

              {totals.missingToFree !== null && (
                <p className="mt-2.5 rounded-lg bg-gold/12 px-3 py-2 text-[13px] font-semibold text-gold">
                  Dodaj jeszcze {pln(totals.missingToFree)} i dostawa będzie darmowa
                </p>
              )}

              {err('min') && (
                <p className="mt-2.5 rounded-lg bg-fire-500/12 px-3 py-2 text-[13px] font-semibold text-fire-400">
                  {err('min')}
                </p>
              )}
              {err('items') && (
                <p className="mt-2.5 rounded-lg bg-fire-500/12 px-3 py-2 text-[13px] font-semibold text-fire-400">
                  {err('items')}
                </p>
              )}

              <button type="submit" className="btn-primary mt-3 w-full" disabled={busy}>
                {phase === 'submitting'
                  ? 'Przetwarzamy…'
                  : online
                    ? `Przejdź do płatności · ${pln(totals.total)}`
                    : `Złóż zamówienie · ${pln(totals.total)}`}
              </button>

              {submitError && (
                <p className="mt-2.5 rounded-lg bg-fire-500/12 px-3 py-2 text-[13px] font-semibold text-fire-400">
                  {submitError}
                </p>
              )}

              <p className="mt-2.5 text-center text-[12px] leading-relaxed text-cream/40">
                {payment && online
                  ? 'Po kliknięciu przejdziesz na bezpieczną stronę płatności.'
                  : 'Zamówienie potwierdzamy telefonicznie lub SMS-em. Płacisz przy odbiorze.'}
              </p>

              <Link
                to="/menu"
                className="mt-2 block w-full py-2 text-center text-[14px] font-semibold text-cream/55 hover:text-cream"
              >
                Dodaj coś jeszcze
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

const FIELD_MAP: Record<string, ErrorKey> = {
  name: 'name',
  phone: 'phone',
  email: 'email',
  address: 'address',
  zone: 'zone',
  pickupTime: 'pickupTime',
  consent: 'consent',
  paymentMethod: 'paymentMethod',
  fulfillmentType: 'paymentMethod',
  items: 'items',
};

const mapServerFields = (fields: Record<string, string>): Errors => {
  const out: Errors = {};
  for (const [key, message] of Object.entries(fields)) {
    const mapped = FIELD_MAP[key];
    if (mapped) out[mapped] = message;
    else out.items = message;
  }
  return out;
};

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={`min-w-0 ${accent ? 'text-emerald-400' : 'text-cream/60'}`}>{label}</dt>
      <dd
        className={`whitespace-nowrap font-semibold tabular-nums ${accent ? 'text-emerald-400' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}

function OptionCard({
  active,
  onClick,
  title,
  text,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  text: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border p-3.5 text-left transition ${
        active ? 'border-fire-500 bg-fire-500/10' : 'border-ink-600 hover:border-cream/40'
      }`}
    >
      <span className="block text-[15px] font-bold">{title}</span>
      <span className="mt-0.5 block text-[13px] leading-snug text-cream/60">{text}</span>
    </button>
  );
}
