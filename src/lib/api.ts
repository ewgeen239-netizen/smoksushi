import type {
  CreateOrderPayload,
  Order,
  PaymentSession,
} from '../shared/payments';

export type ApiError = {
  error: string;
  message?: string;
  fields?: Record<string, string>;
};

export class ApiFailure extends Error {
  status: number;
  body: ApiError;
  constructor(status: number, body: ApiError) {
    super(body.message ?? body.error);
    this.status = status;
    this.body = body;
  }
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new ApiFailure(res.status, data as ApiError);
  return data as T;
};

export type CreateOrderResult = {
  order: Order;
  accessToken: string;
  requiresPayment: boolean;
};

export const createOrder = (payload: CreateOrderPayload) =>
  request<CreateOrderResult>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const createPaymentSession = (orderId: string, token: string) =>
  request<{ session: PaymentSession }>('/api/payments/create-session', {
    method: 'POST',
    body: JSON.stringify({ orderId, token }),
  });

export const fetchOrder = (orderId: string, token: string) =>
  request<{ order: Order }>(
    `/api/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(token)}`,
  );

export type PaymentConfig = {
  provider: string;
  mock: boolean;
  publishableKey: string | null;
};

export const fetchPaymentConfig = () => request<PaymentConfig>('/api/config');
