import { Router } from 'express';
import { adapt } from '../../infra/http/adapt';
import { createNfcTagController } from '../../useCases/Nfc/CreateNfcTag';
import { listNfcTagsController } from '../../useCases/Nfc/ListNfcTags';
import { updateNfcTagController } from '../../useCases/Nfc/UpdateNfcTag';
import { authenticate, authorize } from '../middlewares';

export function buildNfcRoutes() {
  const router = Router();
  const adminOnly = [authenticate(), authorize('ADMIN')];

  router.post('/nfc-tags', ...adminOnly, adapt(createNfcTagController));
  router.get('/nfc-tags', ...adminOnly, adapt(listNfcTagsController));
  router.patch('/nfc-tags/:id', ...adminOnly, adapt(updateNfcTagController));

  return router;
}
