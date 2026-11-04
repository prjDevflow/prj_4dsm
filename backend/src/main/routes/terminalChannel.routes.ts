import { Router } from 'express';
import { adapt } from '../../infra/http/adapt';
import { ackCommandController } from '../../useCases/TerminalChannel/AckCommand';
import { issueQrCredentialController } from '../../useCases/TerminalChannel/IssueQrCredential';
import { listPendingCommandsController } from '../../useCases/TerminalChannel/ListPendingCommands';
import { registerHeartbeatController } from '../../useCases/TerminalChannel/RegisterHeartbeat';
import { authenticateTerminal } from '../middlewares';

/** Routes the terminal calls with its own key (`X-Terminal-Id` and `X-Terminal-Key`). */
export function buildTerminalChannelRoutes() {
  const router = Router();

  router.post('/terminal/heartbeat', authenticateTerminal, adapt(registerHeartbeatController));

  router.post('/terminal/qr', authenticateTerminal, adapt(issueQrCredentialController));

  router.get('/terminal/commands', authenticateTerminal, adapt(listPendingCommandsController));

  router.post('/terminal/commands/:id/ack', authenticateTerminal, adapt(ackCommandController));

  return router;
}
