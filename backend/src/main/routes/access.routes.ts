import { Router } from 'express';
import { adapt } from '../../infra/http/adapt';
import { makeUserRateLimit } from '../../infra/http/userRateLimit';
import { validateQrAccessController } from '../../useCases/Access/ValidateQrAccess';
import { container } from '../container';
import { authenticate } from '../middlewares';

// A function, not a constant: each app gets its own rate-limit counters (tests rely on that).
export function buildAccessRoutes() {
  const router = Router();
  const qrValidateRateLimit = makeUserRateLimit(container.env.QR_VALIDATE_MAX_PER_MINUTE);

  // Any profile, and also an inactive account: the denial `USUARIO_INATIVO` must be recorded as an event.
  router.post(
    '/access/qr/validate',
    authenticate({ allowInactive: true }),
    qrValidateRateLimit,
    adapt(validateQrAccessController),
  );

  return router;
}
