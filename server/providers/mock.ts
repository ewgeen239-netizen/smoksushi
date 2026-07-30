import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Order, PaymentStatus } from '../../src/shared/payments';
import { config } from '../config';
import type { PaymentProvider, WebhookRequest, WebhookResult } from './types';
import { toMinor } from './types';

/**
 * Symulator providera na dev/demo.
 *
 * Zachowuje kształt produkcyjnego flow:
 *  1. tworzymy sesję i przekierowujemy klienta na stronę "providera" (/mock-pay/:id),
 *  2. ta strona NIE zbiera danych karty — ma tylko przyciski wyniku,
 *  3. wynik wraca do nas podpisanym webhookiem (HMAC-SHA256), tak jak u Stripe’a,
 *  4. dopiero webhook ustawia `paid`.
 */
export class MockProvider implements PaymentProvider {
  readonly name = 'mock';

  async createSession(order: Order, returnUrl: string, cancelUrl: string) {
    const sessionId = `mock_cs_${randomUUID()}`;
    const params = new URLSearchParams({
      order: order.id,
      return_url: returnUrl,
      cancel_url: cancelUrl,
    });
    return {
      sessionId,
      provider: this.name,
      redirectUrl: `${config.appUrl}/mock-pay/${sessionId}?${params.toString()}`,
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    };
  }

  async verifyWebhook(req: WebhookRequest): Promise<WebhookResult> {
    const signature = String(req.headers['x-mock-signature'] ?? '');
    if (!verifySignature(req.rawBody, signature)) {
      return { handled: false, reason: 'Nieprawidłowy podpis webhooka' };
    }

    let event: { type?: string; reference?: string; amountMinor?: number; reason?: string };
    try {
      event = JSON.parse(req.rawBody);
    } catch {
      return { handled: false, reason: 'Body nie jest poprawnym JSON-em' };
    }

    const map: Record<string, PaymentStatus> = {
      'payment.succeeded': 'paid',
      'payment.failed': 'failed',
      'payment.cancelled': 'cancelled',
    };
    const status = event.type ? map[event.type] : undefined;
    if (!status || !event.reference) {
      return { handled: false, reason: `Nieobsługiwane zdarzenie: ${event.type ?? 'brak typu'}` };
    }

    return {
      handled: true,
      reference: event.reference,
      status,
      amountMinor: event.amountMinor,
      failureReason: event.reason,
    };
  }
}

export const signMockPayload = (body: string) =>
  createHmac('sha256', config.mock.webhookSecret).update(body).digest('hex');

const verifySignature = (body: string, signature: string) => {
  const expected = signMockPayload(body);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
};

/** Zdarzenie w formacie, jaki symulator wysyła na /api/payments/webhook. */
export const buildMockEvent = (
  order: Order,
  outcome: 'success' | 'failure' | 'cancel',
): { body: string; signature: string } => {
  const type =
    outcome === 'success'
      ? 'payment.succeeded'
      : outcome === 'failure'
        ? 'payment.failed'
        : 'payment.cancelled';

  const body = JSON.stringify({
    id: `evt_${randomUUID()}`,
    type,
    createdAt: new Date().toISOString(),
    reference: order.providerSessionId ?? order.id,
    amountMinor: toMinor(order.total),
    currency: config.currency,
    reason:
      outcome === 'failure'
        ? 'Bank odrzucił transakcję (symulacja)'
        : outcome === 'cancel'
          ? 'Klient przerwał płatność (symulacja)'
          : undefined,
  });

  return { body, signature: signMockPayload(body) };
};
