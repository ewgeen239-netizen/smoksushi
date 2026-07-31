import { useCart } from '../context/CartContext';
import { pln } from '../lib/format';
import type { Product } from '../types';
import BadgePill from './BadgePill';
import SafeImage from './SafeImage';

type Props = {
  product: Product;
  /** 'light' = jasna karta w menu, 'dark' = na ciemnej sekcji home */
  tone?: 'light' | 'dark';
};

export default function ProductCard({ product, tone = 'light' }: Props) {
  const { add, items } = useCart();
  const inCart = items.find((i) => i.id === product.id)?.quantity ?? 0;

  const wrapper =
    tone === 'light'
      ? 'card-light lift flex h-full flex-col overflow-hidden'
      : 'card lift flex h-full flex-col overflow-hidden';

  return (
    <article className={wrapper}>
      <div className="relative overflow-hidden">
        <SafeImage src={product.image} alt={product.name} ratio="photo" className="zoom-img" />
        {product.badges && product.badges.length > 0 && (
          <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
            {product.badges.slice(0, 2).map((b) => (
              <BadgePill key={b} label={b} />
            ))}
          </div>
        )}
        {inCart > 0 && (
          <span className="absolute right-2 top-2 grid h-7 min-w-7 place-items-center rounded-full bg-fire-500 px-2 text-[13px] font-bold text-white">
            {inCart}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-bold leading-snug clamp-2">{product.name}</h3>
          {product.portion && (
            <span
              className={`shrink-0 whitespace-nowrap text-[12px] font-semibold ${
                tone === 'light' ? 'text-ink-900/45' : 'text-cream/45'
              }`}
            >
              {product.portion}
            </span>
          )}
        </div>

        <p
          className={`mt-1.5 text-[13px] leading-relaxed clamp-3 ${
            tone === 'light' ? 'text-ink-900/60' : 'text-cream/60'
          }`}
        >
          {product.description}
        </p>

        <div className="mt-3.5 flex items-center justify-between gap-3 pt-1">
          <span className="display text-2xl leading-none">{pln(product.price)}</span>
          <button type="button" className="btn-primary btn-sm" onClick={() => add(product)}>
            {inCart > 0 ? 'Dodaj +1' : 'Dodaj'}
          </button>
        </div>
      </div>
    </article>
  );
}
