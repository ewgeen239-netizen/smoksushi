import { createHash } from 'node:crypto';
import type { Order, PaymentStatus } from '../../src/shared/payments';
import { config } from '../config';
import type { PaymentProvider, WebhookRequest, WebhookResult } from './types';
import { toMinor } from './types';

/**
 * PayU (REST API v2_1). Płatność odbywa się na stronie PayU.
 *
 * Flow: OAuth token -> POST /api/v2_1/orders -> redirectUri -> notyfikacja
 * (`OpenPayu-Signature`) -> status COMPLETED => `paid`.
 */
type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

const PAY_METHOD: Record<string, { type: string; value: string } | undefined> = {
  blik: { type: 'PBL', value: 'blik' },
  card_online: { type: 'CARD_TOKEN', value: 'CARD_TOKEN' },
  przelewy24: undefined, // pełna lista PBL
};

export class PayUProvider implements PaymentProvider {
  readonly name = 'payu';

  private async accessToken() {
    if (tokenCache && tokenCache.expiresAt > Date.now() + 5_000) return tokenCache.token;

    const res = await fetch(`${config.payu.baseUrl}/pl/standard/user/oauth/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.payu.clientId,
        client_secret: config.payu.clientSecret,
      }).toString(),
    });
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!res.ok || !data.access_token) throw new Error(`PayU OAuth: HTTP ${res.status}`);

    tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 43_000) * 1000,
    };
    return tokenCache.token;
  }

  async createSession(order: Order, returnUrl: string, cancelUrl: string) {
    const token = await this.accessToken();
    const method = PAY_METHOD[order.paymentMethod];

    const body = {
      notifyUrl: `${config.appUrl}/api/payments/webhook?provider=payu`,
      continueUrl: returnUrl,
      customerIp: '127.0.0.1',
      merchantPosId: config.payu.posId,
      description: `Sushi Smok ${order.id}`,
      currencyCode: config.currency,
      totalAmount: String(toMinor(order.total)),
      extOrderId: order.id,
      buyer: {
        email: order.customer.email || 'zamowienia@sushismok.pl',
        phone: order.customer.phone,
        firstName: order.customer.name,
        language: 'pl',
      },
      products: order.items.map((i) => ({
        name: i.name,
        unitPrice: String(toMinor(i.price)),
        quantity: String(i.quantity),
      })),
      ...(method ? { payMethods: { payMethod: method } } : {}),
    };
    void cancelUrl; // PayU wraca zawsze na continueUrl z parametrem `error`

    const res = await fetch(`${config.payu.baseUrl}/api/v2_1/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      redirect: 'manual',
    });

    const data = (await res.json().catch(() => ({}))) as {
      orderId?: string;
      redirectUri?: string;
      status?: { statusCode?: string; codeLiteral?: string };
    };
    if (!data.orderId || !data.redirectUri) {
      throw new Error(`PayU: ${data.status?.codeLiteral ?? `HTTP ${res.status}`}`);
    }

    return { sessionId: data.orderId, redirectUrl: data.redirectUri, provider: this.name };
  }

  async verifyWebhook(req: WebhookRequest): Promise<WebhookResult> {
    const header = String(req.headers['openpayu-signature'] ?? req.headers['x-openpayu-signature'] ?? '');
    if (!verifyPayUSignature(req.rawBody, header, config.payu.signatureKey)) {
      return { handled: false, reason: 'Nieprawidłowy podpis OpenPayu-Signature' };
    }

    let notif: {
      order?: {
        orderId?: string;
        extOrderId?: string;
        status?: string;
        totalAmount?: string;
      };
    };
    try {
      notif = JSON.parse(req.rawBody);
    } catch {
      return { handled: false, reason: 'Body nie jest poprawnym JSON-em' };
    }

    const order = notif.order;
    const reference = order?.extOrderId || order?.orderId;
    if (!order?.status || !reference) {
      return { handled: false, reason: 'Notyfikacja PayU bez statusu' };
    }

    const map: Record<string, PaymentStatus> = {
      PENDING: 'pending',
      WAITING_FOR_CONFIRMATION: 'pending',
      COMPLETED: 'paid',
      CANCELED: 'cancelled',
      REJECTED: 'failed',
    };
    const status = map[order.status];
    if (!status) return { handled: false, reason: `Nieznany status PayU: ${order.status}` };

    return {
      handled: true,
      reference,
      status,
      amountMinor: order.totalAmount ? Number(order.totalAmount) : undefined,
      failureReason: status === 'failed' ? 'PayU odrzuciło płatność' : undefined,
    };
  }
}

/** `OpenPayu-Signature: sender=...;signature=...;algorithm=MD5;content=DOCUMENT` */
export const verifyPayUSignature = (body: string, header: string, signatureKey: string) => {
  if (!signatureKey || !header) return false;
  const parts = header.split(';').reduce<Record<string, string>>((acc, chunk) => {
    const [k, v] = chunk.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});
  const algo = (parts.algorithm ?? 'MD5').toLowerCase().replace('-', '');
  const expected = createHash(algo === 'md5' ? 'md5' : algo)
    .update(body + signatureKey)
    .digest('hex');
  return parts.signature === expected;
};
