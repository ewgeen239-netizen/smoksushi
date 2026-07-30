import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { handleApiRequest } from './api';
import { loadEnvFile } from './env';

loadEnvFile();

const PORT = Number(process.env.PORT ?? 3000);
const DIST = resolve(process.env.STATIC_DIR ?? 'dist');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

const serveStatic = (urlPath: string, res: import('node:http').ServerResponse) => {
  // normalize + prefix check => brak path traversal
  const safe = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  let file = join(DIST, safe);
  if (!file.startsWith(DIST)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');

  // SPA fallback: każda nieznana ścieżka to trasa Reacta
  if (!existsSync(file)) file = join(DIST, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404).end('Brak builda — uruchom `npm run build`');
    return;
  }

  const ext = extname(file);
  const immutable = safe.startsWith('/assets/');
  res.writeHead(200, {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  createReadStream(file).pipe(res);
};

const server = createServer(async (req, res) => {
  try {
    if (await handleApiRequest(req, res)) return;
    serveStatic((req.url ?? '/').split('?')[0], res);
  } catch (err) {
    console.error('[server]', err);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'server_error' }));
  }
});

server.listen(PORT, () => {
  console.log(`[server] Sushi Smok na http://localhost:${PORT}`);
  console.log(`[server] statyki: ${DIST}`);
});
