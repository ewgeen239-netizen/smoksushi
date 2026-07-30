/**
 * Kontrakt płatności współdzielony przez frontend i backend.
 * Backend jest jedynym źródłem prawdy dla kwot i statusów — frontend tylko je pokazuje.
 */
import type { CartItem, FulfillmentType } from '../types';

export type PaymentMethod =
  | 'card_online'
  | 'blik'
  | 'przelewy24'
  | 'cash_on_delivery'
  | 'card_on_delivery';

export type PaymentStatus = 'not_started' | 'pending' | 'paid' | 'failed' | 'cancelled';

/** Status zamówienia w restauracji — 'confirmed' nadaje wyłącznie backend. */
export type OrderStatus = 'awaiting_payment' | 'confirmed' | 'cancelled';

export type CustomerDetails = {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  zone?: string;
  courierNote?: string;
  pickupTime?: string;
  consent: boolean;
};

export type Order = {
  id: string;
  items: CartItem[];
  customer: CustomerDetails;
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  // pola operacyjne (poza minimalnym kontraktem, potrzebne w produkcji)
  status: OrderStatus;
  discount: number;
  discountLabel: string | null;
  promoCode: string | null;
  provider: string | null;
  providerSessionId: string | null;
  paidAt: string | null;
  failureReason: string | null;
  updatedAt: string;
};

/** To, co frontend wolno przysłać. Ceny NIE są przyjmowane od klienta. */
export type CreateOrderPayload = {
  items: { id: string; quantity: number }[];
  customer: CustomerDetails;
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod;
  promoCode?: string | null;
};

export type PaymentSession = {
  sessionId: string;
  /** URL secure checkout providera — tam klient wpisuje dane karty/BLIK, nigdy u nas */
  redirectUrl: string;
  provider: string;
  /** klucz publiczny, gdy provider używa embedded elementu zamiast redirectu */
  publicKey?: string;
  expiresAt?: string;
};

export type PaymentMethodInfo = {
  id: PaymentMethod;
  label: string;
  description: string;
  /** true = płatność przez providera przed przygotowaniem zamówienia */
  online: boolean;
  availableFor: FulfillmentType[];
  /** krótka etykieta pod ikoną w UI */
  hint?: string;
};

export const PAYMENT_METHODS: PaymentMethodInfo[] = [
  {
    id: 'card_online',
    label: 'Karta online',
    description: 'Zapłać bezpiecznie kartą online',
    online: true,
    availableFor: ['delivery', 'pickup'],
    hint: 'Visa · Mastercard',
  },
  {
    id: 'blik',
    label: 'BLIK',
    description: 'Wpisz kod BLIK i potwierdź w aplikacji banku',
    online: true,
    availableFor: ['delivery', 'pickup'],
    hint: 'Najszybsza opcja',
  },
  {
    id: 'przelewy24',
    label: 'Przelewy24',
    description: 'Szybki przelew bankowy',
    online: true,
    availableFor: ['delivery', 'pickup'],
    hint: 'Wszystkie polskie banki',
  },
  {
    id: 'cash_on_delivery',
    label: 'Gotówka przy odbiorze',
    description: 'Zapłać kurierowi przy odbiorze',
    online: false,
    availableFor: ['delivery', 'pickup'],
  },
  {
    id: 'card_on_delivery',
    label: 'Karta przy odbiorze',
    description: 'Zapłać terminalem przy dostawie lub odbiorze',
    online: false,
    availableFor: ['delivery', 'pickup'],
  },
];

export const paymentMethodInfo = (id: PaymentMethod): PaymentMethodInfo => {
  const found = PAYMENT_METHODS.find((m) => m.id === id);
  if (!found) throw new Error(`Nieznana metoda płatności: ${id}`);
  return found;
};

export const isOnlinePayment = (id: PaymentMethod) => paymentMethodInfo(id).online;

export const methodsFor = (fulfillment: FulfillmentType) =>
  PAYMENT_METHODS.filter((m) => m.availableFor.includes(fulfillment));

/** Opis dopasowany do sposobu odbioru — kurier vs. lokal. */
export const describeMethod = (m: PaymentMethodInfo, fulfillment: FulfillmentType) => {
  if (m.id === 'cash_on_delivery' && fulfillment === 'pickup')
    return 'Zapłać gotówką w lokalu przy odbiorze';
  if (m.id === 'card_on_delivery' && fulfillment === 'pickup')
    return 'Zapłać terminalem w lokalu przy odbiorze';
  return m.description;
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  not_started: 'Płatność przy odbiorze',
  pending: 'Płatność w toku',
  paid: 'Zapłacone',
  failed: 'Płatność nieudana',
  cancelled: 'Płatność anulowana',
};
