import { config, providerFallbackNote } from '../config';
import { MockProvider } from './mock';
import { PayUProvider } from './payu';
import { Przelewy24Provider } from './przelewy24';
import { StripeProvider } from './stripe';
import type { PaymentProvider } from './types';

let instance: PaymentProvider | null = null;

export const getProvider = (): PaymentProvider => {
  if (instance) return instance;

  switch (config.provider) {
    case 'stripe':
      instance = new StripeProvider();
      break;
    case 'payu':
      instance = new PayUProvider();
      break;
    case 'przelewy24':
      instance = new Przelewy24Provider();
      break;
    default:
      instance = new MockProvider();
  }

  const note = providerFallbackNote();
  console.log(
    `[payments] provider: ${instance.name}${note ? ` (${note})` : ''}`,
  );
  return instance;
};

/** Webhook może przyjść od innego providera niż aktywny (np. migracja) — pozwalamy wskazać go w query. */
export const getProviderByName = (name?: string | null): PaymentProvider => {
  if (!name || name === config.provider) return getProvider();
  switch (name) {
    case 'stripe':
      return new StripeProvider();
    case 'payu':
      return new PayUProvider();
    case 'przelewy24':
      return new Przelewy24Provider();
    case 'mock':
      return new MockProvider();
    default:
      return getProvider();
  }
};

export type { PaymentProvider };
