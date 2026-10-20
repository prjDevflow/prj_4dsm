import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { RateLimitedError } from '../../shared/errors/AppError';

/**
 * Limits login attempts per IP and e-mail. Every attempt counts, successful or not, so the limit
 * also slows down guessing against one account. The counters live in this process's memory.
 */
export function makeLoginRateLimit(maxPerMinute: number) {
  return rateLimit({
    windowMs: 60_000,
    limit: maxPerMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      return `${ipKeyGenerator(req.ip ?? '')}|${email}`;
    },
    handler: (_req, _res, next) => next(new RateLimitedError()),
  });
}
