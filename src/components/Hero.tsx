import { Link } from 'react-router-dom';
import KineticText from './KineticText';
import SafeImage from './SafeImage';
import { PHOTOS } from '../data/menu';
import { FREE_DELIVERY_FROM, RESTAURANT } from '../data/delivery';
import { pln } from '../lib/format';
import { openStatus } from '../lib/hours';
import { cheapestMinOrder } from '../lib/pricing';
import { useMagnetic, useParallax } from '../lib/motion';

const STATS = [
  { k: 'Dostawa', v: '40–60 min' },
  { k: 'Odbiór', v: '20–30 min' },
  { k: 'Dostawa od', v: pln(8) },
  { k: 'Darmowa od', v: pln(FREE_DELIVERY_FROM) },
];

export default function Hero() {
  const status = openStatus();
  const parallax = useParallax<HTMLDivElement>(0.12);
  const magnet = useMagnetic<HTMLAnchorElement>(0.22);

  return (
    <section className="grain relative isolate overflow-hidden border-b border-white/10">
      {/* tło z parallaxem + delikatnym unoszeniem */}
      <div ref={parallax} className="absolute inset-0 -z-10 will-change-transform">
        <SafeImage
          src={PHOTOS.hero}
          alt=""
          ratio="hero"
          className="float-slow h-full w-full"
          eager
        />
        <div className="absolute inset-0 bg-ink-900/74" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/35 to-ink-900/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-900/80 via-transparent to-transparent" />
        <div className="hero-sheen" />
      </div>

      <div className="shell py-12 sm:py-16 lg:py-24">
        <div className="max-w-[680px]">
          <span
            className={`chip mb-5 backdrop-blur ${
              status.isOpen
                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                : 'border-cream/25 bg-white/5 text-cream/70'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                status.isOpen ? 'bg-emerald-400 pulse-live' : 'bg-cream/50'
              }`}
            />
            {status.label}
          </span>

          <KineticText
            className="display text-[44px] leading-[0.92] sm:text-6xl lg:text-7xl"
            lines={[
              { text: 'Świeże sushi' },
              { text: 'z dostawą' },
              { text: 'w Szczecinie', accent: true },
            ]}
          />

          <p className="reveal is-visible mt-5 max-w-[540px] text-[16px] leading-relaxed text-cream/80 sm:text-lg">
            Zamów online w 2 minuty. Zamówienia od {pln(cheapestMinOrder)}, dostawa {pln(8)} —
            darmowa od {pln(FREE_DELIVERY_FROM)}. Albo odbierz osobiście na {RESTAURANT.street} i
            zapłać {RESTAURANT.pickupDiscount}% mniej.
          </p>

          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <Link
              ref={magnet}
              to="/menu"
              className="btn-primary group w-full will-change-transform sm:w-auto sm:px-9"
            >
              Zamów teraz
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
            <Link to="/dostawa" className="btn-ghost w-full backdrop-blur sm:w-auto sm:px-8">
              Sprawdź dostawę
            </Link>
          </div>

          <dl className="mt-10 grid max-w-[600px] grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
            {STATS.map((f, i) => (
              <div
                key={f.k}
                className="reveal is-visible border-l-2 border-fire-500/40 pl-3"
                style={{ '--reveal-delay': `${i * 90}ms` } as React.CSSProperties}
              >
                <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-cream/45">
                  {f.k}
                </dt>
                <dd className="display mt-1 text-2xl leading-none">{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* scroll cue */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-cream/40 sm:flex">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Przewiń</span>
        <span className="h-8 w-px animate-pulse bg-gradient-to-b from-cream/50 to-transparent" />
      </div>
    </section>
  );
}
