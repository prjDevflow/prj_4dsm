import { Router } from 'express';
import { adapt } from '../../infra/http/adapt';
import { makeLoginRateLimit } from '../../infra/http/loginRateLimit';
import { getCurrentUserController } from '../../useCases/Auth/GetCurrentUser';
import { loginUserController } from '../../useCases/Auth/LoginUser';
import { container } from '../container';
import { authenticate } from '../middlewares';

// A function, not a constant: each app gets its own rate-limit counters (tests rely on that).
export function buildAuthRoutes() {
  const router = Router();
  const loginRateLimit = makeLoginRateLimit(container.env.LOGIN_MAX_PER_MINUTE);

  router.post('/auth/login', loginRateLimit, adapt(loginUserController));
  router.get('/auth/me', authenticate(), adapt(getCurrentUserController));

  return router;
}
