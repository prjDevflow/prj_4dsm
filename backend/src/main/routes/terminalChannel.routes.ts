import { Router } from 'express';
import { adapt } from '../../infra/http/adapt';
import { issueQrCredentialController } from '../../useCases/TerminalChannel/IssueQrCredential';
import { registerHeartbeatController } from '../../useCases/TerminalChannel/RegisterHeartbeat';
import { authenticateTerminal } from '../middlewares';

/** Routes the terminal calls with its own key (`X-Terminal-Id` and `X-Terminal-Key`). */
export function buildTerminalChannelRoutes() {
  const router = Router();

  router.post('/terminal/heartbeat', authenticateTerminal, adapt(registerHeartbeatController));

  router.post('/terminal/qr', authenticateTerminal, adapt(issueQrCredentialController));

  return router;
}
