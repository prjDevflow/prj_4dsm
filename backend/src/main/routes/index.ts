import { Router } from 'express';
import { healthRoutes } from './health.routes';

export function buildApiRouter() {
  const router = Router();
  router.use(healthRoutes);
  return router;
}
