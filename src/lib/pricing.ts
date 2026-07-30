import { DELIVERY_ZONES, RESTAURANT } from '../data/delivery';
import type { CartItem, DeliveryZone, FulfillmentType } from '../types';
import { round2 } from './format';

export const PROMO_CODES: Record<string, { percent: number; label: string }> = {
  SMOK10: { percent: 10, label: 'Kod SMOK10 (pierwsze zamówienie)' },
  SMOKCLUB15: { percent: 15, label: 'Smok Club — Złoty Smok' },
};

export const findZone = (name?: string): DeliveryZone | undefined =>
  DELIVERY_ZONES.find((z) => z.name === name);

export const subtotalOf = (items: CartItem[]) =>
  round2(items.reduce((sum, item) => sum + item.price * item.quantity, 0));

export const itemCountOf = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.quantity, 0);

export type Totals = {
  subtotal: number;
  /** null = nie wybrano jeszcze dzielnicy */
  deliveryFee: number | null;
  freeDelivery: boolean;
  discount: number;
  discountLabel: string | null;
  total: number;
  /** minimalna kwota zamówienia dla wybranego sposobu odbioru */
  minOrder: number;
  /** ile brakuje do minimum (0 = spełnione) */
  missingToMin: number;
  /** ile brakuje do darmowej dostawy (null = strefa bez darmowej dostawy / odbiór) */
  missingToFree: number | null;
  eta: string | null;
};

type CalcInput = {
  items: CartItem[];
  fulfillment: FulfillmentType;
  zoneName?: string;
  promoCode?: string | null;
};

/**
 * Jedno źródło prawdy dla wszystkich kwot w aplikacji.
 * Zasady:
 *  - rabaty się nie łączą — liczymy większy z dwóch (kod promocyjny vs. odbiór osobisty),
 *  - darmowa dostawa i minimum zamówienia liczone są od subtotalu (przed rabatem),
 *  - odbiór osobisty: brak opłaty za dostawę i brak minimum.
 */
export const calcTotals = ({ items, fulfillment, zoneName, promoCode }: CalcInput): Totals => {
  const subtotal = subtotalOf(items);
  const zone = findZone(zoneName);
  const isDelivery = fulfillment === 'delivery';

  const freeDelivery = Boolean(isDelivery && zone?.freeFrom && subtotal >= zone.freeFrom);

  let deliveryFee: number | null = 0;
  if (isDelivery) {
    deliveryFee = zone ? (freeDelivery ? 0 : zone.fee) : null;
  }

  const promo = promoCode ? PROMO_CODES[promoCode.trim().toUpperCase()] : undefined;
  const promoDiscount = promo ? round2((subtotal * promo.percent) / 100) : 0;
  const pickupDiscount =
    fulfillment === 'pickup' ? round2((subtotal * RESTAURANT.pickupDiscount) / 100) : 0;

  let discount = 0;
  let discountLabel: string | null = null;
  if (promoDiscount >= pickupDiscount && promoDiscount > 0 && promo) {
    discount = promoDiscount;
    discountLabel = promo.label;
  } else if (pickupDiscount > 0) {
    discount = pickupDiscount;
    discountLabel = `Odbiór osobisty −${RESTAURANT.pickupDiscount}%`;
  }

  const minOrder = isDelivery ? (zone?.minOrder ?? 0) : 0;
  const missingToMin = Math.max(0, round2(minOrder - subtotal));

  const missingToFree =
    isDelivery && zone?.freeFrom && subtotal < zone.freeFrom
      ? round2(zone.freeFrom - subtotal)
      : null;

  const total = round2(subtotal - discount + (deliveryFee ?? 0));

  return {
    subtotal,
    deliveryFee,
    freeDelivery,
    discount,
    discountLabel,
    total,
    minOrder,
    missingToMin,
    missingToFree,
    eta: isDelivery ? (zone?.eta ?? null) : '20–30 min (przygotowanie)',
  };
};

/** Najniższy próg darmowej dostawy w mieście — do komunikacji marketingowej. */
export const cheapestFreeFrom = Math.min(
  ...DELIVERY_ZONES.filter((z) => z.freeFrom).map((z) => z.freeFrom as number),
);

export const cheapestMinOrder = Math.min(...DELIVERY_ZONES.map((z) => z.minOrder));
