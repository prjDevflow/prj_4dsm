import { Router } from 'express';
import { adapt } from '../../infra/http/adapt';
import { listAccessEventsController } from '../../useCases/Events/ListAccessEvents';
import { authenticate, authorize } from '../middlewares';

export function buildEventsRoutes() {
  const router = Router();

  // Read-only on purpose: events are never edited or removed, so no other method is registered.
  router.get(
    '/access-events',
    authenticate(),
    authorize('ADMIN'),
    adapt(listAccessEventsController),
  );

  return router;
}
