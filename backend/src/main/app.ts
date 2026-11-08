import cors from 'cors';
import express, { type Router } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import swaggerUi from 'swagger-ui-express';
import { makeErrorHandler } from '../infra/http/errorHandler';
import { notFound } from '../infra/http/notFound';
import { makeRequestLogger } from '../infra/http/requestLogger';
import { requestId } from '../infra/http/requestId';
import { container } from './container';
import { loadOpenApiSpec } from './openapi';
import { buildApiRouter } from './routes';

const OFFLINE_BATCH_PATH = '/api/v1/terminal/events/batch';

// One year, written out so the value does not depend on a library default. Only sent in production:
// HTTPS is the host's job (B10), and a browser must not remember "HTTPS only" for localhost.
const HSTS_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export interface AppOptions {
  isProduction?: boolean;
  /** Test-only hook to mount extra routes under /api/v1, before the 404 handler. */
  extraRoutes?: (router: Router) => void;
  /** Test-only hook: reads the request log from a logger the test controls. */
  logger?: Logger;
}

export function createApp({
  isProduction = container.env.NODE_ENV === 'production',
  extraRoutes,
  logger = container.pino,
}: AppOptions = {}) {
  const app = express();

  app.use(requestId);
  app.use(makeRequestLogger(logger));
  app.use(
    helmet({
      strictTransportSecurity: isProduction
        ? { maxAge: HSTS_MAX_AGE_SECONDS, includeSubDomains: true }
        : false,
    }),
  );
  app.use(cors({ origin: container.env.CORS_ORIGINS }));
  // The offline batch has a tighter cap than the rest of the API (doc 07, B19). Mounted first, so the
  // general parser below finds that body already read and leaves it alone.
  app.use(OFFLINE_BATCH_PATH, express.json({ limit: '64kb' }));
  app.use(express.json({ limit: '100kb' }));

  // Swagger UI reads the same openapi.yaml the contract is kept in.
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(loadOpenApiSpec()));

  const api = buildApiRouter();
  extraRoutes?.(api);
  app.use('/api/v1', api);

  app.use(notFound);
  app.use(makeErrorHandler({ logger: container.logger, exposeStack: !isProduction }));

  return app;
}

export const app = createApp();
