import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { RESTAURANT } from '../data/delivery';
import { pln } from '../lib/format';
import Logo from './Logo';

const NAV = [
  { to: '/menu', label: 'Menu' },
  { to: '/dostawa', label: 'Dostawa' },
  { to: '/smok-club', label: 'Smok Club' },
];

export default function Header() {
  const { itemCount, subtotal, openCart } = useCart();
  const [mobileNav, setMobileNav] = useState(false);
  const location = useLocation();

  useEffect(() => setMobileNav(false), [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-900/95 backdrop-blur">
      <div className="shell flex h-16 items-center gap-4">
        <Link to="/" aria-label="Sushi Smok — strona główna" className="shrink-0">
          <Logo />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-lg px-3.5 py-2 text-[15px] font-semibold transition ${
                  isActive ? 'bg-white/10 text-cream' : 'text-cream/65 hover:text-cream'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <a
            href={RESTAURANT.phoneHref}
            className="hidden text-[15px] font-bold text-cream/80 transition hover:text-cream lg:block"
          >
            {RESTAURANT.phone}
          </a>

          <button
            type="button"
            onClick={openCart}
            className="btn-primary btn-sm relative"
            aria-label={`Twój koszyk, ${itemCount} pozycji`}
          >
            <CartIcon />
            <span className="hidden sm:inline">Koszyk</span>
            {itemCount > 0 && (
              <span className="ml-0.5 rounded-full bg-black/25 px-2 py-0.5 text-[12px] font-bold tabular-nums">
                {itemCount} · {pln(subtotal)}
              </span>
            )}
          </button>

          <button
            type="button"
            className="btn-ghost btn-sm !min-h-[40px] !px-3 md:hidden"
            onClick={() => setMobileNav((v) => !v)}
            aria-expanded={mobileNav}
            aria-label="Menu nawigacji"
          >
            <span className="block w-4 space-y-1">
              <span className="block h-0.5 bg-cream" />
              <span className="block h-0.5 bg-cream" />
              <span className="block h-0.5 bg-cream" />
            </span>
          </button>
        </div>
      </div>

      {mobileNav && (
        <nav className="border-t border-white/10 bg-ink-800 px-4 py-3 md:hidden">
          <div className="flex flex-col">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="border-b border-white/5 py-3.5 text-base font-semibold last:border-0"
              >
                {item.label}
              </NavLink>
            ))}
            <a href={RESTAURANT.phoneHref} className="py-3.5 text-base font-bold text-fire-400">
              Zadzwoń: {RESTAURANT.phone}
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 5h2l2.2 10.2a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.55L21 8H7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10.5" cy="20" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
