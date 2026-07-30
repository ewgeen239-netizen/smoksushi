import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { pln } from '../lib/format';
import { itemCountOf } from '../lib/pricing';

/** "Zamów ponownie" — najkrótsza droga do powtórnego zakupu. */
export default function ReorderBlock() {
  const { lastOrder, reorder } = useCart();
  const navigate = useNavigate();

  if (!lastOrder || lastOrder.items.length === 0) return null;

  const names = lastOrder.items.map((i) => `${i.quantity}× ${i.name}`).join(', ');

  return (
    <section className="shell py-8">
      <div className="card overflow-hidden border-fire-500/30 bg-fire-500/[0.07] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-[240px] flex-1">
            <p className="mb-1 text-[12px] font-bold uppercase tracking-[0.16em] text-fire-400">
              Twoje ostatnie zamówienie
            </p>
            <h2 className="display text-2xl leading-tight sm:text-3xl">
              Zamów ponownie swoje ulubione zestawy
            </h2>
            <p className="mt-1.5 line-clamp-2 text-[14px] leading-relaxed text-cream/60">{names}</p>
            <p className="mt-1 text-[13px] text-cream/45">
              {lastOrder.id} · {itemCountOf(lastOrder.items)} poz. ·{' '}
              {pln(lastOrder.subtotal)}
            </p>
          </div>
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            onClick={() => {
              reorder(lastOrder.items);
              navigate('/zamowienie');
            }}
          >
            Dodaj do koszyka · {pln(lastOrder.subtotal)}
          </button>
        </div>
      </div>
    </section>
  );
}
