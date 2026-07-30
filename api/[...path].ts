import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleApiRequest } from '../server/api';
import { loadEnvFile } from '../server/env';

// Na Vercelu env wstrzykuje platforma; loadEnvFile jest no-opem gdy nie ma pliku .env.
loadEnvFile();

/**
 * Catch-all serverless dla Vercela. Obsługuje /api/* natywnie oraz /mock-pay/*
 * (przez rewrite w vercel.json -> /api/mock-pay/*, który handleApiRequest normalizuje).
 * bodyParser wyłączony — webhooki muszą dostać SUROWE body, inaczej weryfikacja
 * podpisu operatora (Stripe/PayU/P24) by się nie zgadzała.
 */
export const config = { api: { bodyParser: false } };

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const handled = await handleApiRequest(req, res);
  if (!handled) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
  }
}
