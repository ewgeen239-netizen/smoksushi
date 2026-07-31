import { useCountUp, useReveal } from '../lib/motion';

type Props = {
  value: number;
  duration?: number;
  className?: string;
  /** tekst przed/po liczbie */
  suffix?: string;
};

/** Liczba, która „dolicza się" do wartości, gdy wejdzie w widok. */
export default function CountUp({ value, duration, className, suffix }: Props) {
  const { ref, visible } = useReveal<HTMLSpanElement>({ threshold: 0.4 });
  const display = useCountUp(value, { start: visible, duration });
  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}
