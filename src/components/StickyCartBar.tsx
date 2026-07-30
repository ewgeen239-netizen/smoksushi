import { useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { pln, plural } from '../lib/format';

/** Pływający pasek koszyka — kluczowy element konwersji na mobile. */
export default function StickyCartBar() {
  const { itemCount, totals, openCart, isOpen } = useCart();
  const { pathname } = useLocation();

  const hiddenOn = ['/zamowienie'];
  if (itemCount === 0 || isOpen || hiddenOn.includes(pathname)) return null;

  return (
    <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pt-3 md:hidden">
      <button
        type="button"
        onClick={openCart}
        className="btn-primary pointer-events-auto w-full !justify-between shadow-pop"
      >
        <span className="flex items-center gap-2">
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-black/25 px-1.5 text-[13px] font-bold tabular-nums">
            {itemCount}
          </span>
          <span className="text-[14px]">
            {plural(itemCount, 'pozycja', 'pozycje', 'pozycji')} w koszyku
          </span>
        </span>
        <span className="text-[15px] font-bold tabular-nums">{pln(totals.total)}</span>
      </button>
    </div>
  );
}
