export default function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-fire-500">
        <span className="block h-4 w-4 rounded-full border-[3px] border-cream" />
      </span>
      <span className="leading-none">
        <span className="display block text-xl leading-none">Sushi Smok</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-cream/45">
          Szczecin
        </span>
      </span>
    </span>
  );
}
