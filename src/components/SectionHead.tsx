import { Link } from 'react-router-dom';
import { useReveal } from '../lib/motion';

type Props = {
  eyebrow?: string;
  title: string;
  text?: string;
  linkTo?: string;
  linkLabel?: string;
  tone?: 'dark' | 'light';
};

export default function SectionHead({
  eyebrow,
  title,
  text,
  linkTo,
  linkLabel,
  tone = 'dark',
}: Props) {
  const muted = tone === 'dark' ? 'text-cream/55' : 'text-ink-900/60';
  const { ref, visible } = useReveal<HTMLDivElement>({ threshold: 0.3 });

  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div ref={ref} className={`max-w-[620px] ${visible ? 'kinetic-ready' : ''}`}>
        {eyebrow && (
          <p
            className={`reveal mb-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-fire-400 ${
              visible ? 'is-visible' : ''
            }`}
            style={{ '--reveal-delay': '40ms' } as React.CSSProperties}
          >
            {eyebrow}
          </p>
        )}
        <h2 className="display text-3xl leading-[1.05] sm:text-4xl">
          <span className="kinetic-line">
            <span style={{ '--kin-delay': '80ms' } as React.CSSProperties}>{title}</span>
          </span>
        </h2>
        {text && (
          <p
            className={`reveal mt-2 text-[15px] leading-relaxed ${muted} ${
              visible ? 'is-visible' : ''
            }`}
            style={{ '--reveal-delay': '160ms' } as React.CSSProperties}
          >
            {text}
          </p>
        )}
      </div>
      {linkTo && linkLabel && (
        <Link
          to={linkTo}
          className={`link-underline text-[14px] font-bold ${
            tone === 'dark' ? 'text-cream' : 'text-ink-900'
          }`}
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
