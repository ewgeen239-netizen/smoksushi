import type { ElementType, ReactNode } from 'react';
import { useReveal } from '../lib/motion';

type Props = {
  children: ReactNode;
  /** opóźnienie startu w ms — do staggeru w siatkach */
  delay?: number;
  className?: string;
  as?: ElementType;
  threshold?: number;
};

/** Owija dowolną treść w scroll-reveal. Bezpieczny przy reduced-motion (hook zwraca visible=true). */
export default function Reveal({
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
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ '--reveal-delay': `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
