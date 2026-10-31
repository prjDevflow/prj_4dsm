import { Router } from 'express';
import { adapt } from '../../infra/http/adapt';
import { createAuthorizationController } from '../../useCases/Authorizations/CreateAuthorization';
import { getAuthorizationController } from '../../useCases/Authorizations/GetAuthorization';
import { authenticate, authorize } from '../middlewares';

export function buildAuthorizationsRoutes() {
  const router = Router();
  // B09 opens `GET /authorizations/:id` to the owner of the authorization.
  const adminOnly = [authenticate(), authorize('ADMIN')];

  router.post('/authorizations', ...adminOnly, adapt(createAuthorizationController));
  router.get('/authorizations/:id', ...adminOnly, adapt(getAuthorizationController));

  return router;
}
