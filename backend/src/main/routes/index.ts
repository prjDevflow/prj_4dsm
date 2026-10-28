import { Router } from 'express';
import { buildAuthRoutes } from './auth.routes';
import { buildAuthorizationsRoutes } from './authorizations.routes';
import { healthRoutes } from './health.routes';
import { buildLocationsRoutes } from './locations.routes';
import { buildTerminalsRoutes } from './terminals.routes';
import { buildUsersRoutes } from './users.routes';

export function buildApiRouter() {
  const router = Router();
  router.use(healthRoutes);
  router.use(buildAuthRoutes());
  router.use(buildUsersRoutes());
  router.use(buildLocationsRoutes());
  router.use(buildTerminalsRoutes());
  router.use(buildAuthorizationsRoutes());
  return router;
}
