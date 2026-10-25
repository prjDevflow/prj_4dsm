import { Router } from 'express';
import { adapt } from '../../infra/http/adapt';
import { createTerminalController } from '../../useCases/Terminals/CreateTerminal';
import { getTerminalController } from '../../useCases/Terminals/GetTerminal';
import { listTerminalsController } from '../../useCases/Terminals/ListTerminals';
import { rotateTerminalKeyController } from '../../useCases/Terminals/RotateTerminalKey';
import { updateTerminalController } from '../../useCases/Terminals/UpdateTerminal';
import { authenticate, authorize } from '../middlewares';

export function buildTerminalsRoutes() {
  const router = Router();
  const adminOnly = [authenticate(), authorize('ADMIN')];

  router.post('/terminals', ...adminOnly, adapt(createTerminalController));
  router.get('/terminals', ...adminOnly, adapt(listTerminalsController));
  router.get('/terminals/:id', ...adminOnly, adapt(getTerminalController));
  router.patch('/terminals/:id', ...adminOnly, adapt(updateTerminalController));
  router.post('/terminals/:id/rotate-key', ...adminOnly, adapt(rotateTerminalKeyController));

  return router;
}
