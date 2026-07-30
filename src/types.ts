export type CategoryId =
  | 'zestawy'
  | 'futomaki'
  | 'uramaki'
  | 'hosomaki'
  | 'nigiri'
  | 'burger'
  | 'przystawki'
  | 'napoje';

export type Badge = 'Bestseller' | 'Ostre' | 'Nowość' | 'Wege' | 'Bez ryby';

/** Struktura gotowa pod panel admina / CMS — jeden płaski obiekt = jedna pozycja w menu. */
export type Product = {
  id: string;
  name: string;
  category: CategoryId;
  description: string;
  /** cena w PLN */
  price: number;
  image: string;
  badges?: string[];
  /** np. "32 szt." — opcjonalny opis porcji */
  portion?: string;
  available?: boolean;
};

export type CartItem = Product & {
  quantity: number;
};

export type DeliveryZone = {
  name: string;
  minOrder: number;
  fee: number;
  freeFrom?: number;
  eta: string;
};

export type Category = {
  id: CategoryId;
  label: string;
  blurb: string;
};

export type FulfillmentType = 'delivery' | 'pickup';

/**
 * Typy płatności i zamówienia żyją w `src/shared/payments.ts` — są współdzielone
 * z backendem (`server/`), więc nie mogą zależeć od niczego z warstwy UI.
 */
