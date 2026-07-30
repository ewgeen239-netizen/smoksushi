// Musi być zaimportowany PRZED modułami czytającymi config/store
// (config zamraża env, a store ładuje plik już przy imporcie).
import { rmSync } from 'node:fs';

process.env.PAYMENT_PROVIDER = 'mock';
process.env.MOCK_WEBHOOK_SECRET = 'test-secret';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
process.env.DATA_DIR = '.data/test';

// czysty start — zanim FileOrderStore wczyta stary plik do pamięci
rmSync('.data/test', { recursive: true, force: true });
export {};
