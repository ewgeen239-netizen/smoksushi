import { ArrowUpRight, Award, Crown } from 'lucide-react';
import { CATEGORIES, PHOTOS, PRODUCTS } from '../data/menu';
import { FREE_DELIVERY_FROM, RESTAURANT } from '../data/delivery';
import { pln } from '../lib/format';

// Suszi w tle (Mixkit, licencja darmowa) — hotlink stabilny, 720p pętla.
// Podmiana: wgraj własne wideo do /public i wskaż ścieżkę tutaj.
const VIDEO_SRC = 'https://assets.mixkit.co/videos/46020/46020-720.mp4';

const STATS = [
  { value: `${PRODUCTS.length}`, label: 'Pozycji w menu' },
  { value: '40–60', label: 'Minut dostawy' },
  { value: `−${RESTAURANT.pickupDiscount}%`, label: 'Przy odbiorze' },
];

/** Kinowy nagłówek strony Menu — pełnoekranowe wideo w tle + treść na wierzchu. */
export default function MenuHero({ onExplore }: { onExplore: () => void }) {
  return (
    <section className="relative isolate flex min-h-[86vh] items-center overflow-hidden border-b border-white/10 bg-ink-900">
      {/* wideo w tle */}
      <video
        className="absolute inset-0 -z-10 h-full w-full object-cover"
        src={VIDEO_SRC}
        poster={PHOTOS.hero}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        onCanPlay={(e) => {
          // niektóre przeglądarki wymagają jawnego play() mimo autoPlay
          void e.currentTarget.play().catch(() => {});
        }}
      />
      {/* przyciemnienie pod tekst */}
      <div className="absolute inset-0 -z-10 bg-ink-900/60" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-900/85 via-ink-900/35 to-ink-900/60" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-900 via-transparent to-ink-900/40" />

      <div className="shell w-full py-16 sm:py-20 lg:py-24">
        <div className="max-w-[720px]">
          {/* tagline */}
          <div className="animate-fade-up mb-6 flex items-center gap-2.5 lg:mb-8">
            <Crown className="h-4 w-4 text-white/70" />
            <span className="font-inter text-xs uppercase tracking-[0.3em] text-white/70 sm:text-sm">
              Świeże sushi z dostawą w Szczecinie
            </span>
          </div>

          {/* nagłówek */}
          <h1 className="animate-fade-up-delay-1 font-podium uppercase leading-[0.92] tracking-tight text-white">
            <span className="block text-[clamp(2.8rem,8vw,7rem)]">Wybierz.</span>
            <span className="block text-[clamp(2.8rem,8vw,7rem)]">Zamów.</span>
            <span className="block text-[clamp(2.8rem,8vw,7rem)] text-fire-400">Delektuj się.</span>
          </h1>

          {/* podtekst */}
          <p className="animate-fade-up-delay-2 mt-6 max-w-md font-inter text-sm leading-relaxed text-white/70 sm:text-base lg:mt-8">
            Kręcimy rolki dopiero po Twoim zamówieniu — dostawa w 40–60 minut albo odbiór osobisty{' '}
            <span className="font-semibold text-white">w 20 minut.</span>
          </p>

          {/* CTA */}
          <div className="animate-fade-up-delay-3 mt-8 flex flex-wrap items-center gap-4 sm:gap-6 lg:mt-10">
            <button
              type="button"
              onClick={onExplore}
              className="group inline-flex items-center gap-2 rounded-lg bg-fire-500 px-5 py-3 font-inter text-[11px] font-semibold uppercase tracking-widest text-white transition hover:bg-fire-600 sm:px-7 sm:py-4 sm:text-xs"
            >
              Zobacz menu
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </button>

            <div className="hidden items-center gap-3 sm:flex">
              <Award className="h-8 w-8 text-white/50" />
              <div className="font-inter text-xs uppercase tracking-wider text-white/60">
                <p>Najczęściej</p>
                <p>zamawiane w Szczecinie</p>
              </div>
            </div>
          </div>

          {/* statystyki */}
          <dl className="animate-fade-up-delay-4 mt-8 flex flex-wrap gap-6 sm:mt-10 sm:gap-12 lg:mt-14 lg:gap-16">
            {STATS.map((s) => (
              <div key={s.label}>
                <dd className="font-inter text-2xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  {s.value}
                </dd>
                <dt className="mt-1 font-inter text-[9px] uppercase tracking-widest text-white/50 sm:text-xs">
                  {s.label}
                </dt>
              </div>
            ))}
          </dl>

          <p className="animate-fade-in-delay mt-8 font-inter text-xs text-white/45">
            {CATEGORIES.length} kategorii · dostawa od {pln(8)} · darmowa od {pln(FREE_DELIVERY_FROM)}{' '}
            · odbiór: {RESTAURANT.street}
          </p>
        </div>
      </div>

      {/* wskaźnik przewijania */}
      <button
        type="button"
        onClick={onExplore}
        aria-label="Przewiń do menu"
        className="animate-fade-in absolute bottom-5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 text-white/50 transition hover:text-white sm:flex"
      >
        <span className="font-inter text-[10px] font-bold uppercase tracking-[0.2em]">Menu</span>
        <span className="h-8 w-px animate-pulse bg-gradient-to-b from-white/60 to-transparent" />
      </button>
    </section>
  );
}
