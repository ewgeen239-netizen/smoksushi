import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CartItem, FulfillmentType, Product } from '../types';
import type { Order } from '../shared/payments';
import { STORAGE_KEYS, readJson, writeJson } from '../lib/storage';
import { PROMO_CODES, calcTotals, itemCountOf, subtotalOf, type Totals } from '../lib/pricing';

type ClubState = {
  points: number;
  orders: number;
  /** id ostatnio nagrodzonego zamówienia — chroni przed podwójnym naliczeniem przy pollingu */
  awardedIds: string[];
};

type Action =
  | { type: 'add'; product: Product; quantity: number }
  | { type: 'increment'; id: string }
  | { type: 'decrement'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'setQuantity'; id: string; quantity: number }
  | { type: 'clear' }
  | { type: 'merge'; items: CartItem[] };

const MAX_QTY = 30;

const clamp = (n: number) => Math.max(1, Math.min(MAX_QTY, n));

function cartReducer(state: CartItem[], action: Action): CartItem[] {
  switch (action.type) {
    case 'add': {
      const existing = state.find((i) => i.id === action.product.id);
      if (existing) {
        return state.map((i) =>
          i.id === action.product.id ? { ...i, quantity: clamp(i.quantity + action.quantity) } : i,
        );
      }
      return [...state, { ...action.product, quantity: clamp(action.quantity) }];
    }
    case 'increment':
      return state.map((i) => (i.id === action.id ? { ...i, quantity: clamp(i.quantity + 1) } : i));
    case 'decrement':
      // zejście poniżej 1 usuwa pozycję — brak "duchów" z quantity 0
      return state.flatMap((i) => {
        if (i.id !== action.id) return [i];
        return i.quantity > 1 ? [{ ...i, quantity: i.quantity - 1 }] : [];
      });
    case 'setQuantity':
      if (action.quantity <= 0) return state.filter((i) => i.id !== action.id);
      return state.map((i) => (i.id === action.id ? { ...i, quantity: clamp(action.quantity) } : i));
    case 'remove':
      return state.filter((i) => i.id !== action.id);
    case 'clear':
      return [];
    case 'merge':
      // dokładamy do istniejącego koszyka, nie nadpisujemy go
      return action.items.reduce(
        (acc, incoming) =>
          cartReducer(acc, { type: 'add', product: incoming, quantity: incoming.quantity }),
        state,
      );
    default:
      return state;
  }
}

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  totals: Totals;
  add: (product: Product, quantity?: number) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  reorder: (items: CartItem[]) => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toast: { id: number; text: string } | null;
  fulfillment: FulfillmentType;
  setFulfillment: (value: FulfillmentType) => void;
  zoneName: string;
  setZoneName: (value: string) => void;
  promoCode: string | null;
  applyPromo: (code: string) => { ok: boolean; message: string };
  clearPromo: () => void;
  club: ClubState;
  lastOrder: Order | null;
  /** zamówienie utworzone: czyścimy koszyk (snapshot jest już na serwerze) */
  commitOrder: (order: Order) => void;
  /** zamówienie opłacone/potwierdzone: naliczamy punkty klubu (raz na id) */
  awardOrder: (order: Order) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(
    cartReducer,
    [] as CartItem[],
    () => readJson<CartItem[]>(STORAGE_KEYS.cart, []),
  );
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [fulfillment, setFulfillment] = useState<FulfillmentType>('delivery');
  const [zoneName, setZoneName] = useState('');
  const [promoCode, setPromoCode] = useState<string | null>(null);
  const [club, setClub] = useState<ClubState>(() => {
    const stored = readJson<ClubState>(STORAGE_KEYS.club, {
      points: 0,
      orders: 0,
      awardedIds: [],
    });
    // migracja starego kształtu bez awardedIds
    return { ...stored, awardedIds: stored.awardedIds ?? [] };
  });
  const [lastOrder, setLastOrder] = useState<Order | null>(() =>
    readJson<Order | null>(STORAGE_KEYS.lastOrder, null),
  );
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => writeJson(STORAGE_KEYS.cart, items), [items]);
  useEffect(() => writeJson(STORAGE_KEYS.club, club), [club]);

  // blokada scrolla tła gdy otwarty drawer
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const showToast = useCallback((text: string) => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text });
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const add = useCallback(
    (product: Product, quantity = 1) => {
      dispatch({ type: 'add', product, quantity });
      showToast(`${product.name} — dodano do koszyka`);
    },
    [showToast],
  );

  const applyPromo = useCallback((code: string) => {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return { ok: false, message: 'Wpisz kod promocyjny.' };
    if (!PROMO_CODES[normalized]) {
      setPromoCode(null);
      return { ok: false, message: 'Ten kod jest nieprawidłowy lub wygasł.' };
    }
    setPromoCode(normalized);
    return { ok: true, message: `Kod ${normalized} został zastosowany.` };
  }, []);

  const commitOrder = useCallback((order: Order) => {
    setLastOrder(order);
    writeJson(STORAGE_KEYS.lastOrder, order);
    dispatch({ type: 'clear' });
    setPromoCode(null);
  }, []);

  const awardOrder = useCallback((order: Order) => {
    setLastOrder(order);
    writeJson(STORAGE_KEYS.lastOrder, order);
    setClub((prev) => {
      if (prev.awardedIds.includes(order.id)) return prev;
      return {
        points: prev.points + Math.floor(order.total / 10),
        orders: prev.orders + 1,
        awardedIds: [order.id, ...prev.awardedIds].slice(0, 50),
      };
    });
  }, []);

  const totals = useMemo(
    () => calcTotals({ items, fulfillment, zoneName, promoCode }),
    [items, fulfillment, zoneName, promoCode],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount: itemCountOf(items),
      subtotal: subtotalOf(items),
      totals,
      add,
      increment: (id) => dispatch({ type: 'increment', id }),
      decrement: (id) => dispatch({ type: 'decrement', id }),
      remove: (id) => dispatch({ type: 'remove', id }),
      clear: () => dispatch({ type: 'clear' }),
      reorder: (next) => {
        dispatch({ type: 'merge', items: next });
        showToast('Ulubione pozycje wróciły do koszyka');
      },
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      toast,
      fulfillment,
      setFulfillment,
      zoneName,
      setZoneName,
      promoCode,
      applyPromo,
      clearPromo: () => setPromoCode(null),
      club,
      lastOrder,
      commitOrder,
      awardOrder,
    }),
    [
      items,
      totals,
      add,
      isOpen,
      toast,
      fulfillment,
      zoneName,
      promoCode,
      applyPromo,
      club,
      lastOrder,
      commitOrder,
      awardOrder,
      showToast,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
