import { useState } from 'react';
import { Link } from 'react-router-dom';
import ReorderBlock from '../components/ReorderBlock';
import SectionHead from '../components/SectionHead';
import { useCart } from '../context/CartContext';
import { CLUB_TIERS, PROMOS } from '../data/promos';
import { RESTAURANT } from '../data/delivery';
import { isValidEmail, isValidPhone } from '../lib/format';

const ORDERS_FOR_REWARD = 10;

export default function Loyalty() {
  const { club } = useCart();
  const [contact, setContact] = useState('');
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const ordersToReward = Math.max(0, ORDERS_FOR_REWARD - (club.orders % ORDERS_FOR_REWARD));
  const progress = ((ORDERS_FOR_REWARD - ordersToReward) / ORDERS_FOR_REWARD) * 100;
  const tier =
    [...CLUB_TIERS].reverse().find((t) => club.points >= t.threshold) ?? CLUB_TIERS[0];

  const subscribe = (e: React.FormEvent) => {
    e.preventDefault();
    const value = contact.trim();
    const valid = channel === 'email' ? isValidEmail(value) : isValidPhone(value);
    if (!valid) {
      setFeedback({
        ok: false,
        text: channel === 'email' ? 'Podaj poprawny adres e-mail.' : 'Podaj poprawny numer telefonu.',
      });
      return;
    }
    setFeedback({
      ok: true,
      text: 'Zapisaliśmy Cię. Kod na pierwsze zamówienie wysyłamy w ciągu kilku minut.',
    });
    setContact('');
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText('SMOK10');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="pb-16">
      {/* hero klubu */}
      <section className="border-b border-white/10 bg-ink-800">
        <div className="shell py-9">
          <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.16em] text-gold">
            Program dla stałych klientów
          </p>
          <h1 className="display text-4xl leading-none sm:text-5xl">Klub Sushi Smok</h1>
          <p className="mt-3 max-w-[640px] text-[15px] leading-relaxed text-cream/65">
            Zamawiasz — zbierasz punkty. 1 punkt za każde 10 zł, co {ORDERS_FOR_REWARD}. zamówienie z
            rabatem, a członkowie klubu dostają kody, których nie ma nigdzie indziej.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="card p-4">
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-cream/45">
                Twoje punkty
              </p>
              <p className="display mt-1 text-4xl leading-none text-gold">{club.points}</p>
            </div>
            <div className="card p-4">
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-cream/45">
                Zamówienia
              </p>
              <p className="display mt-1 text-4xl leading-none">{club.orders}</p>
            </div>
            <div className="card col-span-2 p-4 sm:col-span-1">
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-cream/45">
                Twój poziom
              </p>
              <p className="display mt-1 text-3xl leading-none sm:text-4xl">{tier.name}</p>
            </div>
          </div>

          {/* progres do nagrody */}
          <div className="card mt-3 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[15px] font-bold">
                {ordersToReward === ORDERS_FOR_REWARD && club.orders === 0
                  ? `Złóż pierwsze zamówienie i rozpocznij zbieranie`
                  : `Do rabatu brakuje ${ordersToReward} ${
                      ordersToReward === 1 ? 'zamówienia' : 'zamówień'
                    }`}
              </p>
              <p className="text-[13px] text-cream/50">
                {club.orders % ORDERS_FOR_REWARD}/{ORDERS_FOR_REWARD} zamówień
              </p>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-ink-600">
              <div
                className="h-full rounded-full bg-fire-500 transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2.5 text-[13px] leading-relaxed text-cream/50">
              Punkty i zamówienia liczymy na tym urządzeniu. Po wdrożeniu backendu konto będzie
              powiązane z numerem telefonu.
            </p>
          </div>
        </div>
      </section>

      {/* kod na pierwsze zamówienie */}
      <section className="shell py-9">
        <div className="card border-fire-500/40 bg-fire-500/[0.08] p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="max-w-[520px]">
              <p className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-fire-400">
                Pierwsze zamówienie
              </p>
              <h2 className="display text-3xl leading-[1.05] sm:text-4xl">
                −10% z kodem SMOK10
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-cream/70">
                Kod wpisujesz w koszyku przy składaniu zamówienia. Działa na całe menu, bez
                minimalnej kwoty. Rabaty nie łączą się ze sobą.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
              <button type="button" onClick={copyCode} className="btn-ghost w-full sm:w-auto">
                {copied ? 'Skopiowano ✓' : 'Kopiuj kod SMOK10'}
              </button>
              <Link to="/menu" className="btn-primary w-full sm:w-auto">
                Zamów teraz
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* poziomy */}
      <section className="shell pb-9">
        <SectionHead
          eyebrow="Jak to działa"
          title="Trzy poziomy, coraz lepsze warunki"
          text="Punkty nie wygasają. Poziom przelicza się automatycznie po każdym zamówieniu."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {CLUB_TIERS.map((t, i) => {
            const active = tier.name === t.name;
            return (
              <article
                key={t.name}
                className={`card p-4 ${active ? 'border-gold/50 bg-gold/[0.07]' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="display text-2xl leading-none">{t.name}</span>
                  <span className="display text-2xl leading-none text-cream/25">0{i + 1}</span>
                </div>
                <p className="mt-2 text-[13px] font-semibold text-gold">
                  {t.threshold === 0 ? 'od pierwszego zamówienia' : `od ${t.threshold} pkt`}
                </p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-cream/65">{t.perk}</p>
                {active && (
                  <p className="mt-3 inline-block rounded-sm bg-gold px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-900">
                    Twój poziom
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <ReorderBlock />

      {/* zapis na promocje */}
      <section className="shell py-9">
        <div className="card overflow-hidden">
          <div className="grid lg:grid-cols-2">
            <div className="p-5 sm:p-7">
              <h2 className="display text-3xl leading-[1.05] sm:text-4xl">
                Odbieraj promocje pierwszy
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-cream/65">
                Zapisz się i dostaniesz kod na pierwsze zamówienie oraz informacje o akcjach
                weekendowych. Maksymalnie 2 wiadomości w miesiącu, bez spamu.
              </p>

              <form onSubmit={subscribe} className="mt-5" noValidate>
                <div className="mb-2.5 grid grid-cols-2 gap-2">
                  {(['email', 'sms'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setChannel(c);
                        setFeedback(null);
                      }}
                      className={`min-h-[44px] rounded-lg border px-3 text-[14px] font-semibold transition ${
                        channel === c
                          ? 'border-fire-500 bg-fire-500/12'
                          : 'border-ink-600 text-cream/60 hover:border-cream/40'
                      }`}
                    >
                      {c === 'email' ? 'E-mail' : 'SMS'}
                    </button>
                  ))}
                </div>

                <label className="label" htmlFor="contact">
                  {channel === 'email' ? 'Twój e-mail' : 'Twój numer telefonu'}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="contact"
                    type={channel === 'email' ? 'email' : 'tel'}
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder={channel === 'email' ? 'anna@example.com' : '880 503 760'}
                  />
                  <button type="submit" className="btn-primary shrink-0 sm:w-auto">
                    Zapisz mnie
                  </button>
                </div>
                {feedback && (
                  <p
                    className={`mt-2 text-[13px] font-medium ${
                      feedback.ok ? 'text-emerald-400' : 'text-fire-400'
                    }`}
                  >
                    {feedback.text}
                  </p>
                )}
                <p className="mt-2 text-[12px] leading-relaxed text-cream/40">
                  Zapisując się, zgadzasz się na otrzymywanie informacji marketingowych od Sushi
                  Smok. Możesz zrezygnować w każdej chwili.
                </p>
              </form>
            </div>

            <div className="border-t border-ink-600 bg-ink-700 p-5 sm:p-7 lg:border-l lg:border-t-0">
              <h3 className="display text-2xl">Aktualne promocje</h3>
              <ul className="mt-4 space-y-3">
                {PROMOS.map((p) => (
                  <li key={p.id} className="border-b border-white/8 pb-3 last:border-0 last:pb-0">
                    <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-cream/45">
                      {p.tag}
                    </p>
                    <p className="mt-0.5 text-[16px] font-bold">{p.title}</p>
                    <p className="mt-1 text-[14px] leading-relaxed text-cream/60">{p.text}</p>
                    {p.code && (
                      <p className="mt-1.5 font-mono text-[13px] font-bold text-fire-400">
                        kod: {p.code}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[13px] leading-relaxed text-cream/45">
                Pytania o promocje?{' '}
                <a href={RESTAURANT.phoneHref} className="font-bold text-fire-400">
                  {RESTAURANT.phone}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
