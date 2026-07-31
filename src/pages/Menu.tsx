import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CartAside from '../components/CartAside';
import ProductCard from '../components/ProductCard';
import { CATEGORIES, PRODUCTS } from '../data/menu';
import { FREE_DELIVERY_FROM, RESTAURANT } from '../data/delivery';
import { pln, plural } from '../lib/format';
import type { CategoryId } from '../types';

const ALL = 'wszystkie';

export default function Menu() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');

  const activeCategory = (params.get('kategoria') ?? ALL) as CategoryId | typeof ALL;

  const setCategory = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === ALL) next.delete('kategoria');
    else next.set('kategoria', id);
    setParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      const matchCategory = activeCategory === ALL || p.category === activeCategory;
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.badges ?? []).some((b) => b.toLowerCase().includes(q));
      return matchCategory && matchQuery;
    });
  }, [activeCategory, query]);

  /** przy wyszukiwaniu grupujemy wyniki, przy filtrze kategorii pokazujemy jedną sekcję */
  const groups = useMemo(() => {
    const visible = CATEGORIES.filter((c) =>
      activeCategory === ALL ? true : c.id === activeCategory,
    );
    return visible
      .map((c) => ({ category: c, items: filtered.filter((p) => p.category === c.id) }))
      .filter((g) => g.items.length > 0);
  }, [filtered, activeCategory]);

  return (
    <div className="pb-24 lg:pb-10">
      {/* nagłówek strony */}
      <section className="border-b border-white/10 bg-ink-800">
        <div className="shell py-7">
          <h1 className="display text-4xl leading-none sm:text-5xl">Menu</h1>
          <p className="mt-2 max-w-[620px] text-[15px] leading-relaxed text-cream/60">
            Wszystko kręcimy po złożeniu zamówienia. Dostawa w Szczecinie od {pln(8)}, darmowa od{' '}
            {pln(FREE_DELIVERY_FROM)}. Odbiór osobisty: {RESTAURANT.street} —{' '}
            {RESTAURANT.pickupDiscount}% taniej.
          </p>
        </div>
      </section>

      {/* sticky filtry */}
      <div className="sticky top-16 z-30 border-b border-white/10 bg-ink-900/95 backdrop-blur">
        <div className="shell py-3">
          <div className="relative mb-2.5">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj: łosoś, tempura, wege, ostre…"
              aria-label="Szukaj w menu"
              className="!pl-11"
            />
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cream/40">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
            </span>
          </div>

          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <button
              type="button"
              onClick={() => setCategory(ALL)}
              className={`chip ${
                activeCategory === ALL
                  ? 'border-fire-500 bg-fire-500 text-white'
                  : 'border-ink-600 text-cream/70 hover:border-cream/50'
              }`}
            >
              Wszystko
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`chip ${
                  activeCategory === c.id
                    ? 'border-fire-500 bg-fire-500 text-white'
                    : 'border-ink-600 text-cream/70 hover:border-cream/50'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* treść + koszyk obok na desktopie */}
      <div className="shell grid gap-8 py-7 lg:grid-cols-[1fr_340px]">
        <div>
          <p className="mb-4 text-[13px] text-cream/45">
            {filtered.length} {plural(filtered.length, 'pozycja', 'pozycje', 'pozycji')}
            {query && ` dla „${query}”`}
          </p>

          {groups.length === 0 ? (
            <div className="card px-5 py-12 text-center">
              <p className="display text-2xl">Brak wyników</p>
              <p className="mx-auto mt-2 max-w-[360px] text-[14px] leading-relaxed text-cream/55">
                Nie znaleźliśmy nic dla „{query}”. Spróbuj innej frazy albo wybierz kategorię.
              </p>
              <button
                type="button"
                className="btn-ghost btn-sm mt-4"
                onClick={() => {
                  setQuery('');
                  setCategory(ALL);
                }}
              >
                Wyczyść filtry
              </button>
            </div>
          ) : (
            <div className="space-y-9">
              {groups.map(({ category, items }) => (
                <section key={category.id} id={category.id}>
                  <div className="mb-3.5 flex items-end justify-between gap-3 border-b border-white/10 pb-2">
                    <h2 className="display text-2xl leading-none sm:text-3xl">{category.label}</h2>
                    <p className="shrink-0 text-[12px] text-cream/45">{category.blurb}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {items.map((p) => (
                      <ProductCard key={p.id} product={p} tone="light" />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <CartAside />
      </div>
    </div>
  );
}
