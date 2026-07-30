type Props = {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  /** ciemny wariant na jasnym tle */
  tone?: 'dark' | 'light';
  label?: string;
};

export default function QtyStepper({
  quantity,
  onIncrement,
  onDecrement,
  tone = 'dark',
  label = 'pozycji',
}: Props) {
  const base =
    'grid h-11 w-11 shrink-0 place-items-center rounded-lg text-xl font-semibold leading-none transition active:scale-95';
  const btn =
    tone === 'dark'
      ? `${base} border border-ink-500 bg-ink-700 text-cream hover:border-cream/50`
      : `${base} border border-black/15 bg-white text-ink-900 hover:border-black/40`;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={btn}
        onClick={onDecrement}
        aria-label={quantity > 1 ? `Zmniejsz liczbę ${label}` : `Usuń ${label}`}
      >
        −
      </button>
      <span
        className="w-9 text-center text-[15px] font-bold tabular-nums"
        aria-live="polite"
        aria-label={`Ilość: ${quantity}`}
      >
        {quantity}
      </span>
      <button
        type="button"
        className={btn}
        onClick={onIncrement}
        aria-label={`Zwiększ liczbę ${label}`}
      >
        +
      </button>
    </div>
  );
}
