import type { ReactNode } from 'react';
import { useReveal } from '../lib/motion';

type Line = { text: ReactNode; accent?: boolean };

type Props = {
  lines: Line[];
  className?: string;
  /** odstęp między liniami w ms */
  stagger?: number;
};

/**
 * Kinetyczny nagłówek — kolejne linie wjeżdżają spod maski, gdy wejdzie w widok.
 * Bezpieczny przy reduced-motion (CSS wymusza brak transformacji).
 */
export default function KineticText({ lines, className = '', stagger = 90 }: Props) {
  const { ref, visible } = useReveal<HTMLHeadingElement>({ threshold: 0.3 });
  return (
    <h1 ref={ref} className={`${visible ? 'kinetic-ready' : ''} ${className}`}>
      {lines.map((line, i) => (
        <span key={i} className="kinetic-line">
          <span
            style={{ ['--kin-delay' as string]: `${i * stagger}ms` }}
            className={line.accent ? 'text-fire-400' : undefined}
          >
            {line.text}
          </span>
        </span>
      ))}
    </h1>
  );
}
