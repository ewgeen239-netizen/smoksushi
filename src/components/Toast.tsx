import { useCart } from '../context/CartContext';

export default function Toast() {
  const { toast, openCart, isOpen } = useCart();
  if (!toast || isOpen) return null;

  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className="animate-toast fixed bottom-[88px] left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-[420px] -translate-x-1/2 md:bottom-6"
    >
      <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-ink-800 px-3.5 py-3 shadow-pop">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500 text-[14px] font-bold text-ink-900">
          ✓
        </span>
        <p className="min-w-0 flex-1 truncate text-[14px] font-semibold">{toast.text}</p>
        <button
          type="button"
          onClick={openCart}
          className="shrink-0 whitespace-nowrap text-[13px] font-bold text-fire-400 underline"
        >
          Koszyk
        </button>
      </div>
    </div>
  );
}
