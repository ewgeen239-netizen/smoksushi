const STYLES: Record<string, string> = {
  Bestseller: 'bg-fire-500 text-white border-fire-500',
  Ostre: 'bg-fire-50 text-fire-600 border-fire-500/25',
  Nowość: 'bg-gold text-ink-900 border-gold',
  Wege: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Bez ryby': 'bg-ink-900/5 text-ink-700 border-black/10',
};

export default function BadgePill({ label }: { label: string }) {
  const style = STYLES[label] ?? 'bg-ink-900/5 text-ink-700 border-black/10';
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${style}`}
    >
      {label}
    </span>
  );
}
