import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { RateLimitedError } from '../../shared/errors/AppError';

/**
 * Limits requests per minute for each client IP on the public routes (`/health` and `/ready`, which
 * monitors poll). Routes that share one limiter share the quota. The counters live in this process's memory.
 */
export function makePublicRateLimit(maxPerMinute: number) {
  return rateLimit({
    windowMs: 60_000,
    limit: maxPerMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
    handler: (_req, _res, next) => next(new RateLimitedError()),
  });
}
