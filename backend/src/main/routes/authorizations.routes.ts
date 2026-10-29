import { Router } from 'express';
import { adapt } from '../../infra/http/adapt';
import { cancelAuthorizationController } from '../../useCases/Authorizations/CancelAuthorization';
import { createAuthorizationController } from '../../useCases/Authorizations/CreateAuthorization';
import { getAuthorizationController } from '../../useCases/Authorizations/GetAuthorization';
import { authenticate, authorize } from '../middlewares';

export function buildAuthorizationsRoutes() {
  const router = Router();
  const adminOnly = [authenticate(), authorize('ADMIN')];

  router.post('/authorizations', ...adminOnly, adapt(createAuthorizationController));
  // Any profile: the use case shows an authorization only to an admin or to its owner.
  router.get('/authorizations/:id', authenticate(), adapt(getAuthorizationController));
  router.patch('/authorizations/:id/cancel', ...adminOnly, adapt(cancelAuthorizationController));

  return router;
}
