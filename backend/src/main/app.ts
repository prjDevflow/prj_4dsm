import cors from 'cors';
import express, { type Router } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { makeErrorHandler } from '../infra/http/errorHandler';
import { notFound } from '../infra/http/notFound';
import { makeRequestLogger } from '../infra/http/requestLogger';
import { requestId } from '../infra/http/requestId';
import { container } from './container';
import { loadOpenApiSpec } from './openapi';
import { buildApiRouter } from './routes';

export interface AppOptions {
  isProduction?: boolean;
  /** Test-only hook to mount extra routes under /api/v1, before the 404 handler. */
  extraRoutes?: (router: Router) => void;
}

export function createApp({
  isProduction = container.env.NODE_ENV === 'production',
  extraRoutes,
}: AppOptions = {}) {
  const app = express();

  app.use(requestId);
  app.use(makeRequestLogger(container.pino));
  app.use(helmet());
  app.use(cors({ origin: container.env.CORS_ORIGINS }));
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
