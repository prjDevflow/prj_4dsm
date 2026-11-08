import { Router } from 'express';
import { adapt } from '../../infra/http/adapt';
import { makePublicRateLimit } from '../../infra/http/publicRateLimit';
import { getHealthController } from '../../useCases/Health/GetHealth';
import { getReadinessController } from '../../useCases/Health/GetReadiness';
import { container } from '../container';

// A function, not a constant: each app gets its own rate-limit counters (tests rely on that).
export function buildHealthRoutes() {
  const router = Router();
  // One limiter for both routes: a monitor polling either of them spends the same quota.
  const publicRateLimit = makePublicRateLimit(container.env.PUBLIC_MAX_PER_MINUTE);

  router.get('/health', publicRateLimit, adapt(getHealthController));
  router.get('/ready', publicRateLimit, adapt(getReadinessController));

  return router;
}
