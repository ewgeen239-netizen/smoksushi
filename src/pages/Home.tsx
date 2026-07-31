import { Link } from 'react-router-dom';
import Hero from '../components/Hero';
import Marquee from '../components/Marquee';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import ReorderBlock from '../components/ReorderBlock';
import Vision from '../components/Vision';
import SafeImage from '../components/SafeImage';
import SectionHead from '../components/SectionHead';
import { CATEGORIES, PHOTOS, popularProducts } from '../data/menu';
import { PROMOS } from '../data/promos';
import { DELIVERY_ZONES, RESTAURANT } from '../data/delivery';
import { pln } from '../lib/format';

const MARQUEE = [
  'Świeże sushi codziennie',
  'Dostawa 40–60 min',
  'Darmowa dostawa od 120 zł',
  'Odbiór osobisty −10%',
  'Płatność online · BLIK · karta',
  'Smok Club — punkty za każde zamówienie',
];

const BENEFITS = [
  {
    title: 'Świeże składniki',
    text: 'Ryby dostarczane codziennie, ryż gotowany na każdą zmianę. Rolki kręcimy po złożeniu zamówienia.',
  },
  {
    title: 'Szybka dostawa',
    text: 'Średnio 40–60 minut w Szczecinie. Kurier dzwoni przed przyjazdem, płatność kartą lub BLIK.',
  },
  {
    title: 'Odbiór osobisty',
    text: `${RESTAURANT.street} — zamówienie gotowe w 20–30 minut i zawsze ${RESTAURANT.pickupDiscount}% taniej.`,
  },
  {
    title: 'Promocje dla stałych klientów',
    text: 'Smok Club: punkty za każde zamówienie, co 10. zamówienie z rabatem, kody tylko dla członków.',
  },
];

export default function Home() {
  const popular = popularProducts();

  return (
    <>
      <Hero />

      {/* pasek marki */}
      <div className="border-b border-white/10 bg-ink-800 py-3.5">
        <Marquee items={MARQUEE} />
      </div>

      <ReorderBlock />

      {/* ───────── PROMOCJE */}
      <section className="shell py-10">
        <SectionHead
          eyebrow="Aktualne akcje"
          title="Promocje, które działają dziś"
          text="Kody wpisujesz w koszyku przy składaniu zamówienia. Rabaty nie łączą się ze sobą."
          linkTo="/smok-club"
          linkLabel="Wszystkie promocje →"
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROMOS.map((promo, i) => (
            <Reveal
              as="article"
              key={promo.id}
              delay={i * 90}
              className={`card lift flex flex-col justify-between p-4 ${
                promo.accent === 'fire'
                  ? 'border-fire-500/40 bg-fire-500/[0.08]'
                  : promo.accent === 'gold'
                    ? 'border-gold/35 bg-gold/[0.07]'
                    : ''
              }`}
            >
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cream/50">
                  {promo.tag}
                </p>
                <h3 className="display mt-1.5 text-2xl leading-tight">{promo.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-cream/65">{promo.text}</p>
              </div>
              {promo.code ? (
                <p className="mt-4 flex items-center gap-2 text-[13px] text-cream/55">
                  Kod:
                  <span className="rounded-sm border border-dashed border-cream/40 px-2 py-1 font-mono text-[13px] font-bold text-cream">
                    {promo.code}
                  </span>
                </p>
              ) : (
                <Link
                  to="/menu"
                  className="mt-4 text-[13px] font-bold text-fire-400 underline underline-offset-4"
                >
                  Wybierz z menu →
                </Link>
              )}
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────── POPULARNE SETY */}
      <section className="border-y border-white/10 bg-cream py-10 text-ink-900">
        <div className="shell">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div className="max-w-[620px]">
              <p className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-fire-600">
                Najczęściej zamawiane
              </p>
              <h2 className="display text-3xl leading-[1.05] sm:text-4xl">Popularne zestawy</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-900/60">
                Sprawdzone sety na wieczór dla dwojga albo dla całej ekipy. Dodaj do koszyka i
                zamów w kilku kliknięciach.
              </p>
            </div>
            <Link
              to="/menu"
              className="text-[14px] font-bold text-ink-900 underline decoration-fire-500 decoration-2 underline-offset-4"
            >
              Całe menu →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {popular.map((p, i) => (
              <Reveal key={p.id} delay={i * 90} className="h-full">
                <ProductCard product={p} tone="light" />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── KATEGORIE (skrót do menu) */}
      <section className="shell py-10">
        <SectionHead
          eyebrow="Menu"
          title="Wybierz kategorię"
          text="Zestawy, rolki, nigiri, sushi burgery, przystawki i napoje — wszystko w jednym miejscu."
        />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {CATEGORIES.map((c, i) => (
            <Reveal key={c.id} delay={i * 60}>
              <Link
                to={`/menu?kategoria=${c.id}`}
                className="lift card block h-full p-3.5 hover:border-fire-500/60 hover:bg-fire-500/[0.06]"
              >
                <p className="display text-lg leading-tight">{c.label}</p>
                <p className="mt-1 text-[12px] leading-snug text-cream/50">{c.blurb}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────── PRZEWAGI */}
      <section className="shell pb-10">
        <SectionHead eyebrow="Dlaczego Sushi Smok" title="Cztery rzeczy, na których nie oszczędzamy" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b, i) => (
            <Reveal as="article" key={b.title} delay={i * 90} className="card lift p-4">
              <span className="display text-3xl leading-none text-fire-500">0{i + 1}</span>
              <h3 className="mt-2.5 text-[16px] font-bold">{b.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-cream/60">{b.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────── DOSTAWA SKRÓT */}
      <section className="shell pb-10">
        <Vision className="card overflow-hidden">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-5 sm:p-7">
              <p className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-fire-400">
                Dostawa i odbiór
              </p>
              <h2 className="display text-3xl leading-[1.05] sm:text-4xl">
                Dowozimy w całym Szczecinie
              </h2>
              <ul className="mt-4 divide-y divide-white/8">
                {DELIVERY_ZONES.slice(0, 4).map((z) => (
                  <li key={z.name} className="flex items-baseline justify-between gap-3 py-2.5">
                    <span className="min-w-0 text-[14px] text-cream/75">{z.name}</span>
                    <span className="shrink-0 whitespace-nowrap text-[13px] font-semibold">
                      od {pln(z.minOrder)} · {pln(z.fee)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                <Link to="/dostawa" className="btn-light w-full sm:w-auto">
                  Sprawdź swoją dzielnicę
                </Link>
                <a href={RESTAURANT.phoneHref} className="btn-ghost w-full sm:w-auto">
                  {RESTAURANT.phone}
                </a>
              </div>
            </div>
            <SafeImage
              src={PHOTOS.setMid}
              alt="Zestaw sushi Sushi Smok"
              ratio="wide"
              className="h-full min-h-[220px]"
            />
          </div>
        </Vision>
      </section>

      {/* ───────── SMOK CLUB TEASER */}
      <section className="shell pb-4">
        <Vision className="card border-gold/30 bg-gold/[0.06] p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="max-w-[560px]">
              <p className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-gold">
                Klub Sushi Smok
              </p>
              <h2 className="display text-3xl leading-[1.05] sm:text-4xl">
                Za każde zamówienie zbierasz punkty
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-cream/70">
                1 punkt za każde 10 zł. Co 10. zamówienie z rabatem, darmowa dostawa dla stałych
                klientów i kod −10% na pierwsze zamówienie.
              </p>
            </div>
            <Link to="/smok-club" className="btn-primary w-full sm:w-auto sm:px-8">
              Dołącz do Smok Club
            </Link>
          </div>
        </Vision>
      </section>
    </>
  );
}
