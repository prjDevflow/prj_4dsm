import { Router } from 'express';
import { adapt } from '../../infra/http/adapt';
import { makeTerminalAuthFailLimit } from '../../infra/http/terminalAuthFailLimit';
import { makeTerminalRateLimit } from '../../infra/http/terminalRateLimit';
import { ingestOfflineEventsController } from '../../useCases/Events/IngestOfflineEvents';
import { ackCommandController } from '../../useCases/TerminalChannel/AckCommand';
import { issueQrCredentialController } from '../../useCases/TerminalChannel/IssueQrCredential';
import { validateNfcAccessController } from '../../useCases/Nfc/ValidateNfcAccess';
import { listPendingCommandsController } from '../../useCases/TerminalChannel/ListPendingCommands';
import { registerHeartbeatController } from '../../useCases/TerminalChannel/RegisterHeartbeat';
import { container } from '../container';
import { authenticateTerminal as authenticate } from '../middlewares';

/**
 * Routes the terminal calls with its own key (`X-Terminal-Id` and `X-Terminal-Key`). A function, not a
 * constant: each app gets its own rate-limit counters (tests rely on that).
 */
export function buildTerminalChannelRoutes() {
  const router = Router();
  // In this order: failed authentications are counted per IP before the key is checked, and the
  // per-terminal quota is spent only after the terminal is known.
  const terminalGuard = [
    makeTerminalAuthFailLimit(container.env.TERMINAL_AUTH_FAIL_MAX_PER_MINUTE),
    authenticate,
    makeTerminalRateLimit(container.env.TERMINAL_MAX_PER_MINUTE),
  ];

  router.post('/terminal/heartbeat', ...terminalGuard, adapt(registerHeartbeatController));

  router.post('/terminal/qr', ...terminalGuard, adapt(issueQrCredentialController));

  router.post('/terminal/nfc', ...terminalGuard, adapt(validateNfcAccessController));

  router.post('/terminal/events/batch', ...terminalGuard, adapt(ingestOfflineEventsController));

  router.get('/terminal/commands', ...terminalGuard, adapt(listPendingCommandsController));

  router.post('/terminal/commands/:id/ack', ...terminalGuard, adapt(ackCommandController));

  return router;
}
