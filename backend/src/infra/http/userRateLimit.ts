import { rateLimit } from 'express-rate-limit';
import { RateLimitedError, UnauthorizedError } from '../../shared/errors/AppError';

/**
 * Limits requests per minute for each authenticated user. It must run after `authenticate`: the key is the
 * user of the token, so a client cannot dodge it by changing address, and a person behind a shared address
 * does not use up someone else's quota. The counters live in this process's memory.
 */
export function makeUserRateLimit(maxPerMinute: number) {
  return rateLimit({
    windowMs: 60_000,
    limit: maxPerMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => {
      if (!req.auth) throw new UnauthorizedError();
      return req.auth.userId;
    },
    handler: (_req, _res, next) => next(new RateLimitedError()),
  });
}
