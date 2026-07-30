export const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* prywatny tryb przeglądarki / brak miejsca — ignorujemy */
  }
};

export const STORAGE_KEYS = {
  cart: 'smok.cart.v1',
  club: 'smok.club.v1',
  lastOrder: 'smok.lastOrder.v1',
  customer: 'smok.customer.v1',
  /** token dostępu do bieżącego zamówienia — potrzebny po powrocie od operatora płatności */
  pendingOrder: 'smok.pendingOrder.v1',
} as const;

export type PendingOrderRef = { orderId: string; accessToken: string };
