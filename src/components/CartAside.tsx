import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { RESTAURANT } from '../data/delivery';
import { pln } from '../lib/format';
import QtyStepper from './QtyStepper';

/** Stały koszyk obok menu — tylko desktop (na mobile działa drawer). */
export default function CartAside() {
  const { items, itemCount, totals, increment, decrement, remove, fulfillment, setFulfillment } =
    useCart();

  return (
    <aside className="sticky top-20 hidden lg:block">
      <div className="card overflow-hidden">
        <div className="border-b border-ink-600 px-4 py-3.5">
          <h2 className="display text-xl leading-none">Twój koszyk</h2>
          <p className="mt-1 text-[13px] text-cream/50">
            {itemCount > 0 ? `${itemCount} poz.` : 'Jeszcze nic nie wybrałeś'}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-[14px] leading-relaxed text-cream/55">
              Dodaj pierwszą pozycję z menu — podsumowanie pojawi się tutaj.
            </p>
          </div>
        ) : (
          <>
            <ul className="max-h-[42vh] divide-y divide-white/8 overflow-y-auto px-4">
              {items.map((item) => (
                <li key={item.id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-[14px] font-semibold leading-snug clamp-2">
                      {item.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="shrink-0 text-[12px] text-cream/40 underline hover:text-fire-400"
                    >
                      Usuń
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <QtyStepper
                      quantity={item.quantity}
                      onIncrement={() => increment(item.id)}
                      onDecrement={() => decrement(item.id)}
                      label={item.name}
                    />
                    <span className="whitespace-nowrap text-[14px] font-bold tabular-nums">
                      {pln(item.price * item.quantity)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-ink-600 bg-ink-800 px-4 py-4">
              <div className="mb-3 grid grid-cols-2 gap-2">
                {(['delivery', 'pickup'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFulfillment(type)}
                    className={`min-h-[40px] rounded-lg border px-2 text-[13px] font-semibold transition ${
                      fulfillment === type
                        ? 'border-fire-500 bg-fire-500/12 text-cream'
                        : 'border-ink-600 text-cream/60 hover:border-cream/40'
                    }`}
                  >
                    {type === 'delivery' ? 'Dostawa' : `Odbiór −${RESTAURANT.pickupDiscount}%`}
                  </button>
                ))}
              </div>

              <div className="flex items-baseline justify-between text-[14px]">
                <span className="text-cream/60">Suma częściowa</span>
                <span className="font-semibold tabular-nums">{pln(totals.subtotal)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="mt-1 flex items-baseline justify-between text-[14px] text-emerald-400">
                  <span className="min-w-0 truncate pr-2">{totals.discountLabel}</span>
                  <span className="font-semibold tabular-nums">−{pln(totals.discount)}</span>
                </div>
              )}
              <div className="mt-1 flex items-baseline justify-between text-[14px]">
                <span className="text-cream/60">Dostawa</span>
                <span className="font-semibold tabular-nums">
                  {fulfillment === 'pickup'
                    ? 'Odbiór osobisty'
                    : totals.deliveryFee === null
                      ? 'wybierz dzielnicę'
                      : totals.freeDelivery
                        ? 'Darmowa'
                        : pln(totals.deliveryFee)}
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between border-t border-ink-600 pt-2.5">
                <span className="display text-lg">Razem</span>
                <span className="display text-2xl leading-none">{pln(totals.total)}</span>
              </div>

              {totals.missingToFree !== null && (
                <p className="mt-2.5 rounded-lg bg-gold/12 px-3 py-2 text-[12px] font-semibold text-gold">
                  Do darmowej dostawy brakuje {pln(totals.missingToFree)}
                </p>
              )}

              <Link to="/zamowienie" className="btn-primary mt-3 w-full">
                Przejdź do zamówienia
              </Link>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
