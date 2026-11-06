import { Router } from 'express';
import { buildAccessRoutes } from './access.routes';
import { buildAuthRoutes } from './auth.routes';
import { buildAuthorizationsRoutes } from './authorizations.routes';
import { healthRoutes } from './health.routes';
import { buildLocationsRoutes } from './locations.routes';
import { buildNfcRoutes } from './nfc.routes';
import { buildTerminalChannelRoutes } from './terminalChannel.routes';
import { buildTerminalsRoutes } from './terminals.routes';
import { buildUsersRoutes } from './users.routes';

export function buildApiRouter() {
  const router = Router();
  router.use(healthRoutes);
  router.use(buildAuthRoutes());
  router.use(buildUsersRoutes());
  router.use(buildLocationsRoutes());
  router.use(buildTerminalsRoutes());
  router.use(buildTerminalChannelRoutes());
  router.use(buildAuthorizationsRoutes());
  router.use(buildAccessRoutes());
  router.use(buildNfcRoutes());
  return router;
}
