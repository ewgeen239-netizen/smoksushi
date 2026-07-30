import type { Plugin } from 'vite';
import { loadEnvFile } from './env';

/**
 * Montuje API (`/api/*`, `/mock-pay/*`) w dev serwerze Vite, żeby demo działało
 * z jednego `npm run dev`. Produkcyjnie ten sam handler obsługuje `server/standalone.ts`.
 */
export const apiPlugin = (): Plugin => ({
  name: 'sushismok-api',
  configureServer(server) {
    loadEnvFile();

    server.middlewares.use((req, res, next) => {
      const path = req.url?.split('?')[0] ?? '';
      if (!path.startsWith('/api/') && !path.startsWith('/mock-pay/')) return next();

      // ssrLoadModule => hot reload backendu bez restartu dev servera
      server
        .ssrLoadModule('/server/api.ts')
        .then(async (mod) => {
          const handled = await (
            mod as { handleApiRequest: (req: unknown, res: unknown) => Promise<boolean> }
          ).handleApiRequest(req, res);
          if (!handled) next();
        })
        .catch((err) => {
          server.config.logger.error(`[api] ${String(err)}`);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
          }
          res.end(JSON.stringify({ error: 'server_error', message: String(err) }));
        });
    });
  },
});
