export type ProviderName = 'mock' | 'stripe' | 'payu' | 'przelewy24';

const providers: ProviderName[] = ['mock', 'stripe', 'payu', 'przelewy24'];

const env = (key: string, fallback = '') => process.env[key]?.trim() || fallback;

const rawProvider = env('PAYMENT_PROVIDER', 'mock').toLowerCase();

/** Brak kluczy => automatyczny fallback na mocka, żeby demo działało out of the box. */
const resolveProvider = (): ProviderName => {
  if (!providers.includes(rawProvider as ProviderName)) return 'mock';
  const name = rawProvider as ProviderName;
  if (name === 'stripe' && !env('STRIPE_SECRET_KEY')) return 'mock';
  if (name === 'payu' && !(env('PAYU_CLIENT_ID') && env('PAYU_CLIENT_SECRET'))) return 'mock';
  if (name === 'przelewy24' && !(env('P24_MERCHANT_ID') && env('P24_API_KEY'))) return 'mock';
  return name;
};

export const config = {
  requestedProvider: rawProvider as ProviderName,
  provider: resolveProvider(),
  appUrl: env('APP_URL', 'http://localhost:5173').replace(/\/$/, ''),
  currency: 'PLN',

  stripe: {
    secretKey: env('STRIPE_SECRET_KEY'),
    webhookSecret: env('STRIPE_WEBHOOK_SECRET'),
    publishableKey: env('VITE_STRIPE_PUBLISHABLE_KEY', env('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')),
  },
  payu: {
    clientId: env('PAYU_CLIENT_ID'),
    clientSecret: env('PAYU_CLIENT_SECRET'),
    posId: env('PAYU_POS_ID'),
    signatureKey: env('PAYU_SIGNATURE_KEY'),
    baseUrl: env('PAYU_BASE_URL', 'https://secure.snd.payu.com'),
  },
  przelewy24: {
    merchantId: env('P24_MERCHANT_ID'),
    posId: env('P24_POS_ID', env('P24_MERCHANT_ID')),
    apiKey: env('P24_API_KEY'),
    crc: env('P24_CRC'),
    baseUrl: env('P24_BASE_URL', 'https://sandbox.przelewy24.pl'),
  },
  mock: {
    /** sekret do podpisu webhooka symulatora — ta sama ścieżka kodu co produkcyjna */
    webhookSecret: env('MOCK_WEBHOOK_SECRET', 'mock-webhook-secret'),
  },
  dataDir: env('DATA_DIR', '.data'),
} as const;

export const isMockMode = () => config.provider === 'mock';

export const providerFallbackNote = () =>
  config.requestedProvider !== 'mock' && config.provider === 'mock'
    ? `PAYMENT_PROVIDER=${config.requestedProvider} bez kluczy — używam mocka`
    : null;
