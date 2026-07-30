import { createHash } from 'node:crypto';
import type { Order, PaymentStatus } from '../../src/shared/payments';
import { config } from '../config';
import type { PaymentProvider, WebhookRequest, WebhookResult } from './types';
import { toMinor } from './types';

/**
 * Przelewy24 (REST v1). Klient płaci na stronie P24 — karta/BLIK nigdy nie
 * przechodzą przez nasz serwer.
 *
 * Flow: transaction/register -> redirect na /trnRequest/{token} -> notyfikacja
 * (webhook) -> transaction/verify -> dopiero wtedy `paid`.
 */
const sign = (payload: Record<string, unknown>, crc: string) =>
  createHash('sha384')
    .update(JSON.stringify({ ...payload, crc }))
    .digest('hex');

const auth = () =>
  'Basic ' + Buffer.from(`${config.przelewy24.posId}:${config.przelewy24.apiKey}`).toString('base64');

/** P24 wymaga liczbowego sessionId — mapujemy nasz order.id na stabilny string. */
const sessionIdFor = (order: Order) => `${order.id}`;

export class Przelewy24Provider implements PaymentProvider {
  readonly name = 'przelewy24';

  async createSession(order: Order, returnUrl: string, cancelUrl: string) {
    const sessionId = sessionIdFor(order);
    const amount = toMinor(order.total);

    const body = {
      merchantId: Number(config.przelewy24.merchantId),
      posId: Number(config.przelewy24.posId),
      sessionId,
      amount,
      currency: config.currency,
      description: `Sushi Smok ${order.id}`,
      email: order.customer.email || 'zamowienia@sushismok.pl',
      client: order.customer.name,
      country: 'PL',
      language: 'pl',
      urlReturn: returnUrl,
      urlStatus: `${config.appUrl}/api/payments/webhook?provider=przelewy24`,
      // BLIK = kanał 154, karty = 1; brak wartości => pełna lista metod
      ...(order.paymentMethod === 'blik' ? { method: 154 } : {}),
      sign: sign(
        {
          sessionId,
          merchantId: Number(config.przelewy24.merchantId),
          amount,
          currency: config.currency,
        },
        config.przelewy24.crc,
      ),
    };
    void cancelUrl; // P24 nie ma osobnego cancel_url — anulowanie wraca na urlReturn

    const res = await fetch(`${config.przelewy24.baseUrl}/api/v1/transaction/register`, {
      method: 'POST',
      headers: { Authorization: auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { data?: { token?: string }; error?: string };
    if (!res.ok || !data.data?.token) {
      throw new Error(`Przelewy24: ${data.error ?? `HTTP ${res.status}`}`);
    }

    return {
      sessionId,
      provider: this.name,
      redirectUrl: `${config.przelewy24.baseUrl}/trnRequest/${data.data.token}`,
    };
  }

  async verifyWebhook(req: WebhookRequest): Promise<WebhookResult> {
    let notif: {
      sessionId?: string;
      orderId?: number;
      amount?: number;
      currency?: string;
      sign?: string;
      merchantId?: number;
      posId?: number;
    };
    try {
      notif = JSON.parse(req.rawBody);
    } catch {
      return { handled: false, reason: 'Body nie jest poprawnym JSON-em' };
    }

    if (!notif.sessionId || !notif.orderId || typeof notif.amount !== 'number') {
      return { handled: false, reason: 'Niekompletna notyfikacja P24' };
    }

    const expected = sign(
      {
        merchantId: Number(config.przelewy24.merchantId),
        posId: Number(config.przelewy24.posId),
        sessionId: notif.sessionId,
        amount: notif.amount,
        originAmount: notif.amount,
        currency: notif.currency ?? config.currency,
        orderId: notif.orderId,
        methodId: undefined,
        statement: undefined,
      },
      config.przelewy24.crc,
    );
    if (notif.sign !== expected) {
      return { handled: false, reason: 'Podpis notyfikacji nie zgadza się' };
    }

    // Notyfikacja to dopiero zgłoszenie — potwierdzeniem jest transaction/verify.
    const verified = await this.verifyTransaction(notif.sessionId, notif.amount, notif.orderId);
    const status: PaymentStatus = verified ? 'paid' : 'failed';

    return {
      handled: true,
      reference: notif.sessionId,
      status,
      amountMinor: notif.amount,
      failureReason: verified ? undefined : 'Przelewy24 nie potwierdziło transakcji',
    };
  }

  private async verifyTransaction(sessionId: string, amount: number, orderId: number) {
    const payload = {
      merchantId: Number(config.przelewy24.merchantId),
      posId: Number(config.przelewy24.posId),
      sessionId,
      amount,
      currency: config.currency,
      orderId,
      sign: sign({ sessionId, orderId, amount, currency: config.currency }, config.przelewy24.crc),
    };
    const res = await fetch(`${config.przelewy24.baseUrl}/api/v1/transaction/verify`, {
      method: 'POST',
      headers: { Authorization: auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { data?: { status?: string } };
    return data.data?.status === 'success';
  }
}
