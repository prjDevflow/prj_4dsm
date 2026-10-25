import { Router } from 'express';
import { buildAuthRoutes } from './auth.routes';
import { healthRoutes } from './health.routes';
import { buildUsersRoutes } from './users.routes';

export function buildApiRouter() {
  const router = Router();
  router.use(healthRoutes);
  router.use(buildAuthRoutes());
  router.use(buildUsersRoutes());
  return router;
}
