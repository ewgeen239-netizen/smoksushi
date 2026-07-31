import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import CartDrawer from './components/CartDrawer';
import Footer from './components/Footer';
import Header from './components/Header';
import ScrollProgress from './components/ScrollProgress';
import StickyCartBar from './components/StickyCartBar';
import Toast from './components/Toast';
import { CartProvider } from './context/CartContext';
import Checkout from './pages/Checkout';
import Delivery from './pages/Delivery';
import Home from './pages/Home';
import Loyalty from './pages/Loyalty';
import Menu from './pages/Menu';
import OrderStatus from './pages/OrderStatus';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="shell py-20 text-center">
      <p className="display text-6xl text-fire-500">404</p>
      <h1 className="display mt-2 text-3xl">Nie ma takiej strony</h1>
      <p className="mx-auto mt-2 max-w-[360px] text-[15px] leading-relaxed text-cream/60">
        Ale mamy sushi. Wróć do menu i złóż zamówienie.
      </p>
      <Link to="/menu" className="btn-primary mt-6 sm:px-8">
        Przejdź do menu
      </Link>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    // key na ścieżce => miękkie wejście przy każdej zmianie trasy
    <main key={location.pathname} className="route-fade flex-1">
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/dostawa" element={<Delivery />} />
        <Route path="/smok-club" element={<Loyalty />} />
        <Route path="/zamowienie" element={<Checkout />} />
        <Route path="/zamowienie/status" element={<OrderStatus />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
  );
}

export default function App() {
  return (
    <CartProvider>
      <ScrollProgress />
      <ScrollToTop />
      <div className="flex min-h-dvh flex-col">
        <Header />
        <AnimatedRoutes />
        <Footer />
      </div>
      <StickyCartBar />
      <CartDrawer />
      <Toast />
    </CartProvider>
  );
}
