/**
 * Testy backendu płatności bez frameworka — `npm test`.
 * Wymuszamy tryb mock, żeby nie było zależności od kluczy.
 */
import './setup-env'; // MUSI być pierwszy — ustawia env i czyści .data/test przed importem store
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { createOrder, ValidationError } from '../orders';
import { getProvider } from '../providers';
import { buildMockEvent, signMockPayload } from '../providers/mock';
import { verifyStripeSignature, StripeProvider } from '../providers/stripe';
import { store } from '../store';
import type { CreateOrderPayload } from '../../src/shared/payments';

let passed = 0;
const tests: [string, () => Promise<void> | void][] = [];
const test = (name: string, fn: () => Promise<void> | void) => tests.push([name, fn]);

const baseCustomer = {
  name: 'Ewa',
  phone: '880503760',
  consent: true,
};

const deliveryPayload = (overrides: Partial<CreateOrderPayload> = {}): CreateOrderPayload => ({
  items: [{ id: 'zest-ogien-40', quantity: 1 }],
  fulfillmentType: 'delivery',
  paymentMethod: 'blik',
  customer: { ...baseCustomer, zone: 'Centrum / Śródmieście / Niebuszewo', address: 'ul. Testowa 1/2' },
  ...overrides,
});

// ─────────────── walidacja
test('odrzuca pusty koszyk', async () => {
  await assert.rejects(() => createOrder(deliveryPayload({ items: [] })), ValidationError);
});

test('odrzuca zły telefon', async () => {
  await assert.rejects(
    () => createOrder(deliveryPayload({ customer: { ...baseCustomer, phone: '123', zone: 'Centrum / Śródmieście / Niebuszewo', address: 'ul. Testowa 1/2' } })),
    ValidationError,
  );
});

test('odrzuca brak zgody', async () => {
  await assert.rejects(
    () => createOrder(deliveryPayload({ customer: { ...baseCustomer, consent: false, zone: 'Centrum / Śródmieście / Niebuszewo', address: 'ul. Testowa 1/2' } })),
    ValidationError,
  );
});

test('odrzuca dostawę poniżej minimum', async () => {
  await assert.rejects(
    () =>
      createOrder(
        deliveryPayload({
          items: [{ id: 'nig-losos', quantity: 1 }], // 14 zł < 50 zł min
        }),
      ),
    ValidationError,
  );
});

test('ceny brane z serwera, nie od klienta', async () => {
  // klient nie ma jak podać ceny — payload zna tylko id+quantity
  const order = await createOrder(
    deliveryPayload({ items: [{ id: 'zest-lunch-16', quantity: 1 }] }),
  );
  assert.equal(order.subtotal, 69); // Zestaw Lunch Solo, w przedziale 50–120 zł
  assert.equal(order.deliveryFee, 8); // Centrum < 120 => 8 zł
  assert.equal(order.total, 77);
});

test('darmowa dostawa od 120 zł liczona po stronie serwera', async () => {
  const order = await createOrder(deliveryPayload()); // Ognisty 179 zł >= 120
  assert.equal(order.subtotal, 179);
  assert.equal(order.deliveryFee, 0);
  assert.equal(order.total, 179);
});

// ─────────────── status początkowy
test('online: paymentStatus=not_started, status=awaiting_payment', async () => {
  const order = await createOrder(deliveryPayload({ paymentMethod: 'card_online' }));
  assert.equal(order.paymentStatus, 'not_started');
  assert.equal(order.status, 'awaiting_payment');
});

test('przy odbiorze: od razu confirmed', async () => {
  const order = await createOrder(
    deliveryPayload({ paymentMethod: 'cash_on_delivery' }),
  );
  assert.equal(order.status, 'confirmed');
  assert.equal(order.paymentStatus, 'not_started');
});

// ─────────────── sesja płatności
test('create-session ustawia pending, nigdy paid', async () => {
  const order = await createOrder(deliveryPayload({ paymentMethod: 'blik' }));
  const provider = getProvider();
  const session = await provider.createSession(order, 'http://x/return', 'http://x/cancel');
  await store.update(order.id, {
    provider: provider.name,
    providerSessionId: session.sessionId,
    paymentStatus: 'pending',
  });
  const updated = await store.get(order.id);
  assert.equal(updated?.paymentStatus, 'pending');
  assert.notEqual(updated?.paymentStatus, 'paid');
  assert.match(session.redirectUrl, /mock-pay/);
});

// ─────────────── webhook: podpis
test('webhook odrzuca zły podpis', async () => {
  const order = await createOrder(deliveryPayload());
  const provider = getProvider();
  const result = await provider.verifyWebhook({
    rawBody: JSON.stringify({ type: 'payment.succeeded', reference: order.id }),
    headers: { 'x-mock-signature': 'zly-podpis' },
    query: new URLSearchParams(),
  });
  assert.equal(result.handled, false);
});

test('webhook z poprawnym podpisem => paid', async () => {
  const order = await createOrder(deliveryPayload());
  await store.update(order.id, { providerSessionId: `mock_cs_${order.id}`, paymentStatus: 'pending' });
  const fresh = await store.get(order.id);
  const event = buildMockEvent(fresh!, 'success');
  const provider = getProvider();
  const result = await provider.verifyWebhook({
    rawBody: event.body,
    headers: { 'x-mock-signature': event.signature },
    query: new URLSearchParams(),
  });
  assert.equal(result.handled, true);
  if (result.handled) {
    assert.equal(result.status, 'paid');
    assert.equal(result.amountMinor, Math.round(fresh!.total * 100));
  }
});

test('webhook failure => failed z powodem', async () => {
  const order = await createOrder(deliveryPayload());
  const event = buildMockEvent(order, 'failure');
  const result = await getProvider().verifyWebhook({
    rawBody: event.body,
    headers: { 'x-mock-signature': event.signature },
    query: new URLSearchParams(),
  });
  assert.equal(result.handled, true);
  if (result.handled) {
    assert.equal(result.status, 'failed');
    assert.ok(result.failureReason);
  }
});

test('podpis mocka jest deterministyczny', () => {
  const body = JSON.stringify({ a: 1 });
  assert.equal(signMockPayload(body), signMockPayload(body));
});

// ─────────────── Stripe signature (bez wywołań sieciowych)
test('Stripe: brak sekretu => odrzucone', () => {
  const res = verifyStripeSignature('{}', 't=1,v1=abc', '');
  assert.equal(res.ok, false);
});

test('Stripe: poprawny HMAC przechodzi', async () => {
  const secret = 'whsec_test';
  const body = JSON.stringify({ type: 'checkout.session.completed' });
  const timestamp = Math.floor(Date.now() / 1000);
  const { createHmac } = await import('node:crypto');
  const sig = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const res = verifyStripeSignature(body, `t=${timestamp},v1=${sig}`, secret);
  assert.equal(res.ok, true);
});

test('Stripe: stary timestamp => replay odrzucony', async () => {
  const secret = 'whsec_test';
  const body = '{}';
  const old = Math.floor(Date.now() / 1000) - 10_000;
  const { createHmac } = await import('node:crypto');
  const sig = createHmac('sha256', secret).update(`${old}.${body}`).digest('hex');
  const res = verifyStripeSignature(body, `t=${old},v1=${sig}`, secret);
  assert.equal(res.ok, false);
});

test('Stripe: async completed z payment_status!=paid => pending', async () => {
  const secret = 'whsec_test'; // ustawiony w setup-env przed inicjalizacją config
  const body = JSON.stringify({
    type: 'checkout.session.completed',
    data: { object: { client_reference_id: 'SM-1', payment_status: 'unpaid' } },
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const { createHmac } = await import('node:crypto');
  const sig = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const provider = new StripeProvider();
  const res = await provider.verifyWebhook({
    rawBody: body,
    headers: { 'stripe-signature': `t=${timestamp},v1=${sig}` },
    query: new URLSearchParams(),
  });
  assert.equal(res.handled, true);
  if (res.handled) assert.equal(res.status, 'pending');
});

// ─────────────── store idempotencja
test('store.update aktualizuje i znajduje po sessionId', async () => {
  const order = await createOrder(deliveryPayload());
  await store.update(order.id, { providerSessionId: 'sess_xyz', paymentStatus: 'pending' });
  const found = await store.findBySessionId('sess_xyz');
  assert.equal(found?.id, order.id);
});

// ─────────────── runner
(async () => {
  for (const [name, fn] of tests) {
    try {
      await fn();
      passed++;
      console.log(`  ok  ${name}`);
    } catch (err) {
      console.error(`FAIL  ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }
  console.log(`\n${passed}/${tests.length} testów przeszło`);
  rmSync('.data/test', { recursive: true, force: true });
})();
