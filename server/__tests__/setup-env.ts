// Musi być zaimportowany PRZED modułami czytającymi config (config zamraża env przy starcie).
process.env.PAYMENT_PROVIDER = 'mock';
process.env.MOCK_WEBHOOK_SECRET = 'test-secret';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
process.env.DATA_DIR = '.data/test';
export {};
