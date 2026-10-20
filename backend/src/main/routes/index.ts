import { Router } from 'express';
import { buildAuthRoutes } from './auth.routes';
import { healthRoutes } from './health.routes';

export function buildApiRouter() {
  const router = Router();
  router.use(healthRoutes);
  router.use(buildAuthRoutes());
  return router;
}
