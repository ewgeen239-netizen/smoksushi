import type { Order, PaymentSession, PaymentStatus } from '../../src/shared/payments';

export type WebhookRequest = {
  /** surowe body — podpis liczymy zawsze na bajtach, nie na sparsowanym JSON */
  rawBody: string;
  headers: Record<string, string | string[] | undefined>;
  query: URLSearchParams;
};

export type WebhookResult =
  | {
      handled: true;
      /** referencja do zamówienia: nasz order.id albo sessionId providera */
      reference: string;
      status: PaymentStatus;
      failureReason?: string;
      /** kwota w groszach zgłoszona przez providera — weryfikujemy z zamówieniem */
      amountMinor?: number;
    }
  | { handled: false; reason: string };

export interface PaymentProvider {
  readonly name: string;
  /** klucz publiczny dla embedded elementu (jeśli provider go używa) */
  publicKey?: string;
  createSession(order: Order, returnUrl: string, cancelUrl: string): Promise<PaymentSession>;
  /** weryfikacja podpisu + mapowanie zdarzenia na nasz status */
  verifyWebhook(req: WebhookRequest): Promise<WebhookResult>;
  /** opcjonalne dopytanie providera o status (np. po powrocie klienta) */
  fetchStatus?(order: Order): Promise<PaymentStatus | null>;
}

export const toMinor = (amount: number) => Math.round(amount * 100);
