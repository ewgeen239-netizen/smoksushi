import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Order, PaymentMethod, PaymentStatus } from '../../src/shared/payments';
import { config } from '../config';
import type { PaymentProvider, WebhookRequest, WebhookResult } from './types';
import { toMinor } from './types';

/**
 * Stripe Checkout (hosted). Dane karty i BLIK zbiera Stripe na swojej domenie —
 * u nas nie ma i nie może być żadnego pola na numer karty.
 *
 * Celowo bez SDK: jedno zależności mniej, a REST + własna weryfikacja podpisu
 * pokazują dokładnie, co się dzieje. Podmiana na `stripe` npm to kwestia gustu.
 */
const STRIPE_API = 'https://api.stripe.com/v1';

const METHOD_MAP: Record<PaymentMethod, string[]> = {
  card_online: ['card'],
  blik: ['blik'],
  przelewy24: ['p24'],
  cash_on_delivery: [],
  card_on_delivery: [],
};

export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe';
  readonly publicKey = config.stripe.publishableKey || undefined;

  async createSession(order: Order, returnUrl: string, cancelUrl: string) {
    const types = METHOD_MAP[order.paymentMethod];
    if (types.length === 0) {
      throw new Error(`Metoda ${order.paymentMethod} nie jest płatnością online`);
    }

    const form = new URLSearchParams();
    form.set('mode', 'payment');
    form.set('success_url', returnUrl);
    form.set('cancel_url', cancelUrl);
    form.set('client_reference_id', order.id);
    form.set('metadata[order_id]', order.id);
    types.forEach((t, i) => form.set(`payment_method_types[${i}]`, t));
    if (order.customer.email) form.set('customer_email', order.customer.email);

    // Jedna pozycja zbiorcza: kwota jest już policzona po stronie serwera,
    // więc Stripe nie ma szansy rozjechać się z naszym totalem.
    form.set('line_items[0][quantity]', '1');
    form.set('line_items[0][price_data][currency]', config.currency.toLowerCase());
    form.set('line_items[0][price_data][unit_amount]', String(toMinor(order.total)));
    form.set('line_items[0][price_data][product_data][name]', `Sushi Smok — ${order.id}`);
    form.set(
      'line_items[0][price_data][product_data][description]',
      order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ').slice(0, 480),
    );

    const res = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.stripe.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        // ochrona przed podwójną sesją przy retry z tego samego stanu
        'Idempotency-Key': `${order.id}:${order.updatedAt}`,
      },
      body: form.toString(),
    });

    const data = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
    if (!res.ok || !data.id || !data.url) {
      throw new Error(`Stripe: ${data.error?.message ?? `HTTP ${res.status}`}`);
    }

    return {
      sessionId: data.id,
      redirectUrl: data.url,
      provider: this.name,
      publicKey: this.publicKey,
    };
  }

  async verifyWebhook(req: WebhookRequest): Promise<WebhookResult> {
    const header = String(req.headers['stripe-signature'] ?? '');
    const verdict = verifyStripeSignature(req.rawBody, header, config.stripe.webhookSecret);
    if (!verdict.ok) return { handled: false, reason: verdict.reason };

    let event: {
      type?: string;
      data?: { object?: Record<string, unknown> };
    };
    try {
      event = JSON.parse(req.rawBody);
    } catch {
      return { handled: false, reason: 'Body nie jest poprawnym JSON-em' };
    }

    const object = event.data?.object ?? {};
    const reference =
      (object.client_reference_id as string) ||
      ((object.metadata as Record<string, string> | undefined)?.order_id ?? '') ||
      (object.id as string) ||
      '';

    const map: Record<string, PaymentStatus> = {
      'checkout.session.completed': 'paid',
      'checkout.session.async_payment_succeeded': 'paid',
      'checkout.session.async_payment_failed': 'failed',
      'checkout.session.expired': 'cancelled',
      'payment_intent.payment_failed': 'failed',
      'payment_intent.canceled': 'cancelled',
    };
    const status = event.type ? map[event.type] : undefined;
    if (!status || !reference) {
      return { handled: false, reason: `Nieobsługiwane zdarzenie: ${event.type ?? 'brak typu'}` };
    }

    // `completed` przy metodach asynchronicznych (BLIK/P24) nie znaczy jeszcze "zapłacone"
    if (status === 'paid' && object.payment_status && object.payment_status !== 'paid') {
      return { handled: true, reference, status: 'pending' };
    }

    return {
      handled: true,
      reference,
      status,
      amountMinor: typeof object.amount_total === 'number' ? object.amount_total : undefined,
      failureReason:
        status === 'failed'
          ? ((object.last_payment_error as { message?: string } | undefined)?.message ??
            'Płatność odrzucona przez bank')
          : undefined,
    };
  }

  async fetchStatus(order: Order): Promise<PaymentStatus | null> {
    if (!order.providerSessionId) return null;
    const res = await fetch(`${STRIPE_API}/checkout/sessions/${order.providerSessionId}`, {
      headers: { Authorization: `Bearer ${config.stripe.secretKey}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { payment_status?: string; status?: string };
    if (data.payment_status === 'paid') return 'paid';
    if (data.status === 'expired') return 'cancelled';
    return 'pending';
  }
}

/** Weryfikacja `Stripe-Signature: t=...,v1=...` — schemat HMAC-SHA256 z sekretu webhooka. */
export const verifyStripeSignature = (
  body: string,
  header: string,
  secret: string,
  toleranceSeconds = 300,
): { ok: true } | { ok: false; reason: string } => {
  if (!secret) return { ok: false, reason: 'Brak STRIPE_WEBHOOK_SECRET' };
  if (!header) return { ok: false, reason: 'Brak nagłówka Stripe-Signature' };

  const parts = header.split(',').reduce<Record<string, string[]>>((acc, chunk) => {
    const [k, v] = chunk.split('=');
    if (!k || !v) return acc;
    (acc[k.trim()] ??= []).push(v.trim());
    return acc;
  }, {});

  const timestamp = parts.t?.[0];
  const signatures = parts.v1 ?? [];
  if (!timestamp || signatures.length === 0) {
    return { ok: false, reason: 'Nagłówek podpisu ma nieoczekiwany format' };
  }

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) {
    return { ok: false, reason: 'Zdarzenie poza okresem tolerancji (replay?)' };
  }

  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const match = signatures.some((sig) => {
    const buf = Buffer.from(sig, 'utf8');
    return buf.length === expectedBuf.length && timingSafeEqual(buf, expectedBuf);
  });

  return match ? { ok: true } : { ok: false, reason: 'Podpis nie zgadza się z body' };
};
