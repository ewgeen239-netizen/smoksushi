type Props = {
  items: string[];
  /** sekundy na pełny cykl */
  speed?: number;
  className?: string;
};

/** Nieskończony pasek — premium akcent między sekcjami. Pauza na hover. */
export default function Marquee({ items, speed = 34, className = '' }: Props) {
  // podwajamy listę, żeby pętla -50% była płynna
  const doubled = [...items, ...items];
  return (
    <div
      className={`marquee marquee-fade group relative overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div
        className="marquee-track"
        style={{ ['--marquee-speed' as string]: `${speed}s` }}
      >
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center">
            <span className="px-6 text-[13px] font-bold uppercase tracking-[0.2em] text-cream/70">
              {item}
            </span>
            <span className="text-fire-500">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
