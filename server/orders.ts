import { randomUUID } from 'node:crypto';
import { PRODUCTS } from '../src/data/menu';
import { DELIVERY_ZONES } from '../src/data/delivery';
import { calcTotals } from '../src/lib/pricing';
import { isValidEmail, isValidPhone } from '../src/lib/format';
import type { CartItem } from '../src/types';
import {
  isOnlinePayment,
  methodsFor,
  type CreateOrderPayload,
  type Order,
  type PaymentMethod,
} from '../src/shared/payments';
import { store } from './store';

export class ValidationError extends Error {
  fields: Record<string, string>;
  constructor(fields: Record<string, string>) {
    super('Payload nie przeszedł walidacji');
    this.fields = fields;
  }
}

const MAX_QTY = 30;

/** Numer widoczny dla klienta i restauracji: SM-RRMMDD-XXXX */
const orderNumber = (date = new Date()) => {
  const y = String(date.getFullYear()).slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = randomUUID().replace(/\D/g, '').slice(0, 4).padEnd(4, '0');
  return `SM-${y}${m}${d}-${rand}`;
};

/**
 * Ceny bierzemy wyłącznie z katalogu serwera — cokolwiek klient przyśle w `price`
 * jest ignorowane. To jedyna ochrona przed podmianą kwoty w devtoolsach.
 */
const resolveItems = (payload: CreateOrderPayload): CartItem[] => {
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new ValidationError({ items: 'Koszyk jest pusty.' });
  }

  const items: CartItem[] = [];
  for (const line of payload.items) {
    const product = PRODUCTS.find((p) => p.id === line.id);
    if (!product) throw new ValidationError({ items: `Pozycja ${line.id} jest niedostępna.` });

    const quantity = Math.floor(Number(line.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QTY) {
      throw new ValidationError({ items: `Nieprawidłowa ilość dla „${product.name}".` });
    }
    const existing = items.find((i) => i.id === product.id);
    if (existing) existing.quantity = Math.min(MAX_QTY, existing.quantity + quantity);
    else items.push({ ...product, quantity });
  }
  return items;
};

const validateCustomer = (payload: CreateOrderPayload) => {
  const fields: Record<string, string> = {};
  const c = payload.customer ?? ({} as CreateOrderPayload['customer']);

  if (!c.name || c.name.trim().length < 2) fields.name = 'Podaj imię (min. 2 znaki).';
  if (!c.phone || !isValidPhone(c.phone)) fields.phone = 'Podaj poprawny numer telefonu.';
  if (c.email && !isValidEmail(c.email)) fields.email = 'Ten e-mail jest niepoprawny.';
  if (!c.consent) fields.consent = 'Wymagana zgoda na kontakt w sprawie zamówienia.';

  if (payload.fulfillmentType !== 'delivery' && payload.fulfillmentType !== 'pickup') {
    fields.fulfillmentType = 'Wybierz dostawę albo odbiór osobisty.';
  }

  if (payload.fulfillmentType === 'delivery') {
    if (!c.zone || !DELIVERY_ZONES.some((z) => z.name === c.zone)) {
      fields.zone = 'Wybierz dzielnicę z listy.';
    }
    if (!c.address || c.address.trim().length < 5) {
      fields.address = 'Podaj ulicę, numer domu i mieszkania.';
    }
  } else if (!c.pickupTime) {
    fields.pickupTime = 'Wybierz godzinę odbioru.';
  }

  const allowed = methodsFor(payload.fulfillmentType).map((m) => m.id);
  if (!allowed.includes(payload.paymentMethod)) {
    fields.paymentMethod = 'Wybierz metodę płatności.';
  }

  return fields;
};

export const createOrder = async (payload: CreateOrderPayload): Promise<Order> => {
  const fields = validateCustomer(payload);
  if (Object.keys(fields).length > 0) throw new ValidationError(fields);

  const items = resolveItems(payload);
  const totals = calcTotals({
    items,
    fulfillment: payload.fulfillmentType,
    zoneName: payload.customer.zone,
    promoCode: payload.promoCode ?? null,
  });

  if (payload.fulfillmentType === 'delivery' && totals.deliveryFee === null) {
    throw new ValidationError({ zone: 'Nie udało się wyliczyć dostawy dla tej dzielnicy.' });
  }
  if (totals.missingToMin > 0) {
    throw new ValidationError({
      items: `Minimalna wartość zamówienia dla tej dzielnicy to ${totals.minOrder} zł.`,
    });
  }

  const online = isOnlinePayment(payload.paymentMethod);
  const now = new Date().toISOString();

  const order: Order = {
    id: orderNumber(),
    items,
    customer: {
      name: payload.customer.name.trim(),
      phone: payload.customer.phone.trim(),
      email: payload.customer.email?.trim() || undefined,
      address: payload.fulfillmentType === 'delivery' ? payload.customer.address?.trim() : undefined,
      zone: payload.fulfillmentType === 'delivery' ? payload.customer.zone : undefined,
      courierNote: payload.customer.courierNote?.trim() || undefined,
      pickupTime: payload.fulfillmentType === 'pickup' ? payload.customer.pickupTime : undefined,
      consent: true,
    },
    fulfillmentType: payload.fulfillmentType,
    paymentMethod: payload.paymentMethod,
    // online: nic nie jest zapłacone dopóki nie przyjdzie webhook
    paymentStatus: 'not_started',
    // płatność przy odbiorze => kuchnia może startować od razu
    status: online ? 'awaiting_payment' : 'confirmed',
    subtotal: totals.subtotal,
    deliveryFee: totals.deliveryFee ?? 0,
    discount: totals.discount,
    discountLabel: totals.discountLabel,
    promoCode: payload.promoCode?.trim().toUpperCase() || null,
    total: totals.total,
    provider: null,
    providerSessionId: null,
    paidAt: null,
    failureReason: null,
    createdAt: now,
    updatedAt: now,
  };

  return store.create(order);
};

/** Idempotencja retry: ten sam order, nowa sesja płatności. */
export const canRetryPayment = (order: Order) =>
  isOnlinePayment(order.paymentMethod) &&
  order.paymentStatus !== 'paid' &&
  order.status !== 'cancelled';

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  card_online: 'Karta online',
  blik: 'BLIK',
  przelewy24: 'Przelewy24',
  cash_on_delivery: 'Gotówka przy odbiorze',
  card_on_delivery: 'Karta przy odbiorze',
};
