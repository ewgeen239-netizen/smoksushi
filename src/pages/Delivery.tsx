import { Link } from 'react-router-dom';
import { DELIVERY_ZONES, FAQ, FREE_DELIVERY_FROM, RESTAURANT } from '../data/delivery';
import { pln } from '../lib/format';
import { openStatus } from '../lib/hours';
import SectionHead from '../components/SectionHead';

const MAP_SRC = `https://maps.google.com/maps?q=${encodeURIComponent(
  'Pomarańczowa 7, Szczecin',
)}&z=13&output=embed`;

export default function Delivery() {
  const status = openStatus();

  return (
    <div className="pb-16">
      {/* nagłówek */}
      <section className="border-b border-white/10 bg-ink-800">
        <div className="shell py-8">
          <h1 className="display text-4xl leading-none sm:text-5xl">Dostawa i odbiór</h1>
          <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-cream/60">
            Dowozimy sushi w całym Szczecinie — średnio w 40–60 minut. Poniżej znajdziesz minimalne
            kwoty i koszty dostawy dla swojej dzielnicy. Darmowa dostawa od{' '}
            {pln(FREE_DELIVERY_FROM)} w wybranych strefach.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className={`chip ${
                status.isOpen
                  ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                  : 'border-cream/25 bg-white/5 text-cream/70'
              }`}
            >
              {status.label}
            </span>
            <span className="chip border-ink-600 text-cream/70">Płatność kartą i BLIK u kuriera</span>
            <span className="chip border-ink-600 text-cream/70">Zasięg ok. 12 km od lokalu</span>
          </div>
        </div>
      </section>

      {/* strefy */}
      <section className="shell py-9">
        <SectionHead
          eyebrow="Strefy dostawy"
          title="Sprawdź swoją dzielnicę"
          text="Koszt dostawy i minimalna kwota zamówienia zależą od strefy. Kwoty liczone są od sumy koszyka przed rabatem."
        />

        {/* desktop: tabela */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-white/15 text-[12px] uppercase tracking-wider text-cream/45">
                <th className="py-3 pr-4 font-bold">Dzielnica</th>
                <th className="py-3 pr-4 font-bold">Min. zamówienie</th>
                <th className="py-3 pr-4 font-bold">Koszt dostawy</th>
                <th className="py-3 pr-4 font-bold">Darmowa od</th>
                <th className="py-3 font-bold">Czas</th>
              </tr>
            </thead>
            <tbody>
              {DELIVERY_ZONES.map((z) => (
                <tr key={z.name} className="border-b border-white/8">
                  <td className="py-3.5 pr-4 font-semibold">{z.name}</td>
                  <td className="py-3.5 pr-4 tabular-nums text-cream/75">{pln(z.minOrder)}</td>
                  <td className="py-3.5 pr-4 tabular-nums text-cream/75">{pln(z.fee)}</td>
                  <td className="py-3.5 pr-4 tabular-nums">
                    {z.freeFrom ? (
                      <span className="font-semibold text-emerald-400">{pln(z.freeFrom)}</span>
                    ) : (
                      <span className="text-cream/35">—</span>
                    )}
                  </td>
                  <td className="py-3.5 text-cream/75">{z.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* mobile: karty */}
        <div className="grid gap-2.5 md:hidden">
          {DELIVERY_ZONES.map((z) => (
            <article key={z.name} className="card p-4">
              <h3 className="text-[15px] font-bold leading-snug">{z.name}</h3>
              <dl className="mt-3 grid grid-cols-2 gap-y-2 text-[13px]">
                <dt className="text-cream/50">Min. zamówienie</dt>
                <dd className="text-right font-semibold tabular-nums">{pln(z.minOrder)}</dd>
                <dt className="text-cream/50">Koszt dostawy</dt>
                <dd className="text-right font-semibold tabular-nums">{pln(z.fee)}</dd>
                <dt className="text-cream/50">Darmowa dostawa</dt>
                <dd className="text-right font-semibold tabular-nums">
                  {z.freeFrom ? (
                    <span className="text-emerald-400">od {pln(z.freeFrom)}</span>
                  ) : (
                    <span className="text-cream/35">niedostępna</span>
                  )}
                </dd>
                <dt className="text-cream/50">Czas dostawy</dt>
                <dd className="text-right font-semibold">{z.eta}</dd>
              </dl>
            </article>
          ))}
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-cream/45">
          Nie widzisz swojej dzielnicy? Zadzwoń na{' '}
          <a href={RESTAURANT.phoneHref} className="font-bold text-fire-400">
            {RESTAURANT.phone}
          </a>{' '}
          — ustalimy indywidualne warunki dostawy.
        </p>
      </section>

      {/* mapa + odbiór osobisty */}
      <section className="shell pb-9">
        <div className="card overflow-hidden">
          <div className="grid lg:grid-cols-2">
            <div className="p-5 sm:p-7">
              <p className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-fire-400">
                Odbiór osobisty −{RESTAURANT.pickupDiscount}%
              </p>
              <h2 className="display text-3xl leading-[1.05] sm:text-4xl">{RESTAURANT.street}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-cream/65">
                Zamówienie na odbiór jest gotowe w 20–30 minut i zawsze{' '}
                {RESTAURANT.pickupDiscount}% taniej — bez opłaty za dostawę i bez minimalnej kwoty.
              </p>

              <dl className="mt-4 space-y-2 text-[14px]">
                <div className="flex justify-between gap-4 border-b border-white/8 pb-2">
                  <dt className="text-cream/50">Adres</dt>
                  <dd className="text-right font-semibold">
                    {RESTAURANT.street}, {RESTAURANT.city}
                  </dd>
                </div>
                {RESTAURANT.hours.map((h) => (
                  <div key={h.days} className="flex justify-between gap-4 border-b border-white/8 pb-2">
                    <dt className="text-cream/50">{h.days}</dt>
                    <dd className="text-right font-semibold">{h.time}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4">
                  <dt className="text-cream/50">Telefon</dt>
                  <dd className="text-right">
                    <a href={RESTAURANT.phoneHref} className="font-bold text-fire-400">
                      {RESTAURANT.phone}
                    </a>
                  </dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                <Link to="/menu" className="btn-primary w-full sm:w-auto">
                  Zamów na odbiór
                </Link>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent('Pomarańczowa 7, Szczecin')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost w-full sm:w-auto"
                >
                  Otwórz w Mapach
                </a>
              </div>
            </div>

            <div className="min-h-[280px] border-t border-ink-600 bg-ink-700 lg:border-l lg:border-t-0">
              <iframe
                title="Mapa — Sushi Smok, ul. Pomarańczowa 7, Szczecin"
                src={MAP_SRC}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full min-h-[280px] w-full border-0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="shell">
        <SectionHead eyebrow="FAQ" title="Najczęstsze pytania" />
        <div className="space-y-2">
          {FAQ.map((item) => (
            <details key={item.q} className="card group p-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-[15px] font-bold">
                {item.q}
                <span className="shrink-0 text-xl text-fire-400 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="px-4 pb-4 text-[14px] leading-relaxed text-cream/65">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
