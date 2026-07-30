import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CreateOrderPayload, Order, PaymentStatus } from '../src/shared/payments';
import { isOnlinePayment } from '../src/shared/payments';
import { config, isMockMode } from './config';
import { canRetryPayment, createOrder, ValidationError } from './orders';
import { buildMockEvent, signMockPayload } from './providers/mock';
import { getProvider, getProviderByName } from './providers';
import { toMinor } from './providers/types';
import { store } from './store';

const json = (res: ServerResponse, status: number, body: unknown) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
};

const html = (res: ServerResponse, status: number, body: string) => {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
};

const readRawBody = (req: IncomingMessage, limitBytes = 512 * 1024) =>
  new Promise<string>((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('Body przekracza limit'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

/**
 * Token dostępu do zamówienia — deterministyczny HMAC, nic nie trzymamy w bazie.
 * Bez niego samo zgadnięcie numeru zamówienia nie wystarczy, żeby zobaczyć dane klienta.
 */
const accessTokenFor = (orderId: string) =>
  createHmac('sha256', config.mock.webhookSecret + ':orders').update(orderId).digest('hex').slice(0, 32);

const tokenMatches = (orderId: string, token: string | null) => {
  if (!token) return false;
  const expected = Buffer.from(accessTokenFor(orderId), 'utf8');
  const given = Buffer.from(token, 'utf8');
  return expected.length === given.length && timingSafeEqual(expected, given);
};

const publicOrder = (order: Order) => ({
  ...order,
  customer: { ...order.customer, consent: order.customer.consent },
});

/** Zwraca true, jeśli żądanie zostało obsłużone. */
export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const url = new URL(req.url ?? '/', config.appUrl);
  const path = url.pathname;
  const method = (req.method ?? 'GET').toUpperCase();

  if (!path.startsWith('/api/') && !path.startsWith('/mock-pay/')) return false;

  try {
    // ─────────────── konfiguracja dla frontendu
    if (path === '/api/config' && method === 'GET') {
      const provider = getProvider();
      json(res, 200, {
        provider: provider.name,
        mock: isMockMode(),
        publishableKey: provider.publicKey ?? null,
      });
      return true;
    }

    // ─────────────── utworzenie zamówienia
    if (path === '/api/orders' && method === 'POST') {
      const raw = await readRawBody(req);
      let payload: CreateOrderPayload;
      try {
        payload = JSON.parse(raw) as CreateOrderPayload;
      } catch {
        json(res, 400, { error: 'invalid_json', message: 'Nieprawidłowe dane zamówienia.' });
        return true;
      }

      try {
        const order = await createOrder(payload);
        console.log(`[orders] utworzono ${order.id} (${order.paymentMethod}, ${order.total} zł)`);
        json(res, 201, {
          order: publicOrder(order),
          accessToken: accessTokenFor(order.id),
          requiresPayment: isOnlinePayment(order.paymentMethod),
        });
      } catch (err) {
        if (err instanceof ValidationError) {
          json(res, 422, { error: 'validation_failed', fields: err.fields });
          return true;
        }
        throw err;
      }
      return true;
    }

    // ─────────────── status zamówienia (polling po powrocie od providera)
    const orderMatch = path.match(/^\/api\/orders\/([\w-]+)$/);
    if (orderMatch && method === 'GET') {
      const id = orderMatch[1];
      if (!tokenMatches(id, url.searchParams.get('token'))) {
        json(res, 403, { error: 'forbidden', message: 'Brak dostępu do zamówienia.' });
        return true;
      }
      const order = await store.get(id);
      if (!order) {
        json(res, 404, { error: 'not_found', message: 'Nie znaleźliśmy takiego zamówienia.' });
        return true;
      }
      json(res, 200, { order: publicOrder(order) });
      return true;
    }

    // ─────────────── sesja płatności u providera
    if (path === '/api/payments/create-session' && method === 'POST') {
      const raw = await readRawBody(req);
      const body = JSON.parse(raw || '{}') as { orderId?: string; token?: string };
      const orderId = body.orderId ?? '';

      if (!tokenMatches(orderId, body.token ?? null)) {
        json(res, 403, { error: 'forbidden', message: 'Brak dostępu do zamówienia.' });
        return true;
      }

      const order = await store.get(orderId);
      if (!order) {
        json(res, 404, { error: 'not_found', message: 'Nie znaleźliśmy takiego zamówienia.' });
        return true;
      }
      if (!isOnlinePayment(order.paymentMethod)) {
        json(res, 400, {
          error: 'not_online_payment',
          message: 'To zamówienie jest opłacane przy odbiorze.',
        });
        return true;
      }
      if (!canRetryPayment(order)) {
        json(res, 409, {
          error: 'already_settled',
          message: 'To zamówienie jest już opłacone lub anulowane.',
        });
        return true;
      }

      const provider = getProvider();
      const returnUrl = `${config.appUrl}/zamowienie/status?orderId=${encodeURIComponent(order.id)}`;
      const cancelUrl = `${returnUrl}&cancelled=1`;

      try {
        const session = await provider.createSession(order, returnUrl, cancelUrl);
        // pending = czekamy na webhook; NIGDY nie ustawiamy tu 'paid'
        await store.update(order.id, {
          provider: provider.name,
          providerSessionId: session.sessionId,
          paymentStatus: 'pending',
          failureReason: null,
        });
        console.log(`[payments] sesja ${session.sessionId} dla ${order.id} (${provider.name})`);
        json(res, 201, { session });
      } catch (err) {
        console.error('[payments] nie udało się utworzyć sesji:', err);
        json(res, 502, {
          error: 'provider_error',
          message: 'Operator płatności nie odpowiedział. Spróbuj ponownie.',
        });
      }
      return true;
    }

    // ─────────────── webhook: jedyne miejsce, które ustawia 'paid'
    if (path === '/api/payments/webhook' && method === 'POST') {
      const rawBody = await readRawBody(req);
      const provider = getProviderByName(url.searchParams.get('provider'));
      const result = await provider.verifyWebhook({
        rawBody,
        headers: req.headers,
        query: url.searchParams,
      });

      if (!result.handled) {
        console.warn(`[webhook] odrzucony (${provider.name}): ${result.reason}`);
        // 400 => provider ponowi próbę; nie zwracamy 200 na nieweryfikowalne zdarzenia
        json(res, 400, { received: false, reason: result.reason });
        return true;
      }

      const order =
        (await store.findBySessionId(result.reference)) ??
        (await store.findByProviderRef(result.reference));

      if (!order) {
        console.warn(`[webhook] brak zamówienia dla referencji ${result.reference}`);
        json(res, 404, { received: false, reason: 'unknown_order' });
        return true;
      }

      // kwota z providera musi zgadzać się z naszą — inaczej nie potwierdzamy
      if (
        result.status === 'paid' &&
        typeof result.amountMinor === 'number' &&
        result.amountMinor !== toMinor(order.total)
      ) {
        console.error(
          `[webhook] rozjazd kwot dla ${order.id}: provider ${result.amountMinor}, my ${toMinor(order.total)}`,
        );
        await store.update(order.id, {
          paymentStatus: 'failed',
          failureReason: 'Kwota z operatora nie zgadza się z zamówieniem.',
        });
        json(res, 409, { received: true, reason: 'amount_mismatch' });
        return true;
      }

      // idempotencja: powtórka tego samego zdarzenia nic nie zmienia
      if (order.paymentStatus === 'paid' && result.status === 'paid') {
        json(res, 200, { received: true, duplicate: true });
        return true;
      }

      const patch = patchForStatus(result.status, result.failureReason);
      await store.update(order.id, patch);
      console.log(`[webhook] ${order.id} -> ${result.status} (${provider.name})`);
      json(res, 200, { received: true });
      return true;
    }

    // ─────────────── symulator providera (tylko tryb mock)
    if (path.startsWith('/mock-pay/')) {
      if (!isMockMode()) {
        json(res, 404, { error: 'not_found' });
        return true;
      }
      return handleMockPay(req, res, url, method);
    }

    json(res, 404, { error: 'not_found', message: 'Nieznany endpoint.' });
    return true;
  } catch (err) {
    console.error('[api] błąd:', err);
    json(res, 500, { error: 'server_error', message: 'Coś padło po naszej stronie.' });
    return true;
  }
}

const patchForStatus = (status: PaymentStatus, failureReason?: string): Partial<Order> => {
  switch (status) {
    case 'paid':
      return {
        paymentStatus: 'paid',
        status: 'confirmed',
        paidAt: new Date().toISOString(),
        failureReason: null,
      };
    case 'failed':
      return {
        paymentStatus: 'failed',
        status: 'awaiting_payment',
        failureReason: failureReason ?? 'Płatność nie została zrealizowana.',
      };
    case 'cancelled':
      return {
        paymentStatus: 'cancelled',
        status: 'awaiting_payment',
        failureReason: failureReason ?? 'Płatność anulowana.',
      };
    default:
      return { paymentStatus: status };
  }
};

/**
 * Strona "operatora" w trybie demo. Nie ma tu i nie może być pól na dane karty —
 * jedyne co robi, to symuluje wynik i wysyła podpisany webhook, tak jak Stripe.
 */
async function handleMockPay(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  method: string,
): Promise<boolean> {
  const complete = url.pathname.match(/^\/mock-pay\/([\w-]+)\/complete$/);
  if (complete && method === 'POST') {
    const sessionId = complete[1];
    const raw = await readRawBody(req);
    const form = new URLSearchParams(raw);
    const outcome = (form.get('outcome') ?? 'success') as 'success' | 'failure' | 'cancel';
    const returnUrl = form.get('return_url') || `${config.appUrl}/zamowienie/status`;

    const order = await store.findBySessionId(sessionId);
    if (!order) {
      html(res, 404, mockPage({ title: 'Nie znaleziono sesji płatności', body: '' }));
      return true;
    }

    // dokładnie ta sama ścieżka co produkcyjna: podpisany webhook -> nasz endpoint
    const event = buildMockEvent(order, outcome);
    const webhookRes = await fetch(`${config.appUrl}/api/payments/webhook?provider=mock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-mock-signature': event.signature },
      body: event.body,
    }).catch((err) => {
      console.error('[mock-pay] webhook nie doszedł:', err);
      return null;
    });

    if (!webhookRes?.ok) console.warn('[mock-pay] webhook zwrócił', webhookRes?.status);

    // status strony i tak czyta realny paymentStatus; hint cancelled tylko dla anulowania
    const location = outcome === 'cancel' ? `${returnUrl}&cancelled=1` : returnUrl;
    res.writeHead(303, { Location: location });
    res.end();
    return true;
  }

  const session = url.pathname.match(/^\/mock-pay\/([\w-]+)$/);
  if (session && method === 'GET') {
    const sessionId = session[1];
    const order = await store.findBySessionId(sessionId);
    if (!order) {
      html(res, 404, mockPage({ title: 'Sesja płatności wygasła', body: '' }));
      return true;
    }
    const returnUrl = url.searchParams.get('return_url') ?? `${config.appUrl}/zamowienie/status`;
    html(res, 200, mockCheckoutPage(order, sessionId, returnUrl));
    return true;
  }

  json(res, 404, { error: 'not_found' });
  return true;
}

const mockPage = ({ title, body }: { title: string; body: string }) => `<!doctype html>
<html lang="pl"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  :root { color-scheme: dark }
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:#0B0B0D;
    color:#F7F5F2; font:16px/1.5 Inter, system-ui, sans-serif; padding:24px }
  .card { width:100%; max-width:420px; border:1px solid #22222B; border-radius:8px; background:#121216; overflow:hidden }
  .bar { background:#E9B44C; color:#0B0B0D; font-weight:700; font-size:13px; padding:8px 16px; text-align:center }
  .body { padding:20px }
  h1 { font-size:20px; margin:0 0 4px }
  p { color:rgba(247,245,242,.6); margin:0 0 16px; font-size:14px }
  dl { margin:0 0 20px; font-size:14px }
  .row { display:flex; justify-content:space-between; gap:12px; padding:8px 0; border-bottom:1px solid rgba(255,255,255,.07) }
  .row:last-child { border:0 }
  dt { color:rgba(247,245,242,.5) } dd { margin:0; font-weight:600 }
  button { width:100%; min-height:48px; border-radius:8px; border:0; font:600 15px Inter, system-ui, sans-serif;
    cursor:pointer; margin-bottom:8px }
  .ok { background:#16a34a; color:#fff } .fail { background:#E8291B; color:#fff }
  .cancel { background:transparent; color:rgba(247,245,242,.65); border:1px solid #2E2E39 }
  code { font-size:12px; color:rgba(247,245,242,.4) }
</style></head><body><div class="card">
<div class="bar">TRYB DEMO — symulator operatora płatności</div>
<div class="body">${body || `<h1>${title}</h1>`}</div></div></body></html>`;

const mockCheckoutPage = (order: Order, sessionId: string, returnUrl: string) => {
  const escape = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  const action = `/mock-pay/${encodeURIComponent(sessionId)}/complete`;
  const hidden = `<input type="hidden" name="return_url" value="${escape(returnUrl)}" />`;

  return mockPage({
    title: 'Płatność demo',
    body: `
      <h1>Płatność ${escape(order.id)}</h1>
      <p>To symulator. Nie zbiera żadnych danych karty — wybierz wynik, a my wyślemy
         podpisany webhook dokładnie tak, jak zrobiłby to Stripe czy Przelewy24.</p>
      <dl>
        <div class="row"><dt>Metoda</dt><dd>${escape(order.paymentMethod)}</dd></div>
        <div class="row"><dt>Do zapłaty</dt><dd>${order.total.toFixed(2)} zł</dd></div>
        <div class="row"><dt>Pozycje</dt><dd>${order.items.reduce((n, i) => n + i.quantity, 0)}</dd></div>
      </dl>
      <form method="post" action="${action}">
        ${hidden}<button class="ok" name="outcome" value="success" type="submit">Symuluj udaną płatność</button>
      </form>
      <form method="post" action="${action}">
        ${hidden}<button class="fail" name="outcome" value="failure" type="submit">Symuluj odrzucenie</button>
      </form>
      <form method="post" action="${action}">
        ${hidden}<button class="cancel" name="outcome" value="cancel" type="submit">Anuluj płatność</button>
      </form>
      <code>session: ${escape(sessionId)}</code>`,
  });
};

export { accessTokenFor, signMockPayload };
