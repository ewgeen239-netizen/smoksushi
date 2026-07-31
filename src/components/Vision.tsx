import type { ElementType, ReactNode } from 'react';
import { useReveal } from '../lib/motion';

type Props = {
  children: ReactNode;
  /** opóźnienie startu w ms — do staggeru */
  delay?: number;
  className?: string;
  as?: ElementType;
  threshold?: number;
};

/**
 * „Vision reveal" — treść wyostrza się przy wejściu w widok:
 * odsłona clip-path od dołu + wyjście ze skali i rozmycia.
 * Bezpieczny przy reduced-motion (hook zwraca visible=true, CSS neutralizuje).
 */
export default function Vision({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div',
  threshold,
}: Props) {
  const { ref, visible } = useReveal<HTMLDivElement>({ threshold });
  return (
    <Tag
      ref={ref}
      className={`vision ${visible ? 'is-visible' : ''} ${className}`}
      style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
