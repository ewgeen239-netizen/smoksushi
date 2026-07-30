import { Link } from 'react-router-dom';

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
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="max-w-[620px]">
        {eyebrow && (
          <p className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-fire-400">
            {eyebrow}
          </p>
        )}
        <h2 className="display text-3xl leading-[1.05] sm:text-4xl">{title}</h2>
        {text && <p className={`mt-2 text-[15px] leading-relaxed ${muted}`}>{text}</p>}
      </div>
      {linkTo && linkLabel && (
        <Link
          to={linkTo}
          className={`text-[14px] font-bold underline decoration-fire-500 decoration-2 underline-offset-4 ${
            tone === 'dark' ? 'text-cream' : 'text-ink-900'
          }`}
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
