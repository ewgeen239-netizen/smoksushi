import { Link } from 'react-router-dom';
import { RESTAURANT } from '../data/delivery';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer id="kontakt" className="mt-16 border-t border-white/10 bg-ink-800">
      <div className="shell grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-[280px] text-[14px] leading-relaxed text-cream/55">
            Świeże sushi robione na miejscu. Dostawa i odbiór osobisty w Szczecinie.
          </p>
        </div>

        <div>
          <h3 className="display mb-3 text-lg">Kontakt</h3>
          <ul className="space-y-2 text-[14px] text-cream/70">
            <li>{RESTAURANT.street}, {RESTAURANT.city}</li>
            <li>
              <a href={RESTAURANT.phoneHref} className="font-bold text-cream hover:text-fire-400">
                {RESTAURANT.phone}
              </a>
            </li>
            <li>
              <a
                href={RESTAURANT.instagram}
                target="_blank"
                rel="noreferrer"
                className="hover:text-fire-400"
              >
                Instagram @sushismok_s
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="display mb-3 text-lg">Godziny</h3>
          <ul className="space-y-2 text-[14px] text-cream/70">
            {RESTAURANT.hours.map((h) => (
              <li key={h.days} className="flex justify-between gap-4">
                <span>{h.days}</span>
                <span className="font-semibold text-cream">{h.time}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="display mb-3 text-lg">Zamawianie</h3>
          <ul className="space-y-2 text-[14px] text-cream/70">
            <li>
              <Link to="/menu" className="hover:text-fire-400">
                Menu
              </Link>
            </li>
            <li>
              <Link to="/dostawa" className="hover:text-fire-400">
                Strefy i koszty dostawy
              </Link>
            </li>
            <li>
              <Link to="/smok-club" className="hover:text-fire-400">
                Smok Club — rabaty
              </Link>
            </li>
            <li>
              <Link to="/zamowienie" className="hover:text-fire-400">
                Koszyk i zamówienie
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 py-5">
        <div className="shell flex flex-col gap-2 text-[12px] text-cream/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Sushi Smok Szczecin. Wszystkie ceny zawierają VAT.</p>
          <p>Alergeny i skład dań — informacja telefoniczna oraz w lokalu.</p>
        </div>
      </div>
    </footer>
  );
}
