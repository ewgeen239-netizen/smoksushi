import { PHOTOS } from '../data/menu';
import { FREE_DELIVERY_FROM, RESTAURANT } from '../data/delivery';
import { pln } from '../lib/format';

// Suszi w tle (Mixkit, licencja darmowa) — hotlink stabilny, 720p pętla.
// Podmiana: wgraj własne wideo do /public i wskaż ścieżkę tutaj.
const VIDEO_SRC = 'https://assets.mixkit.co/videos/46020/46020-720.mp4';

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
          <h1 className="animate-fade-up font-podium text-[clamp(3rem,9vw,7rem)] uppercase leading-[0.92] tracking-tight text-white">
            Menu
          </h1>
          <p className="animate-fade-up-delay-1 mt-4 max-w-[620px] font-inter text-[15px] leading-relaxed text-white/70 sm:text-base">
            Wszystko kręcimy po złożeniu zamówienia. Dostawa w Szczecinie od {pln(8)}, darmowa od{' '}
            {pln(FREE_DELIVERY_FROM)}. Odbiór osobisty: {RESTAURANT.street} —{' '}
            {RESTAURANT.pickupDiscount}% taniej.
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
