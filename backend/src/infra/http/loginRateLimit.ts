import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { RateLimitedError } from '../../shared/errors/AppError';

/** The counter key: client IP plus the e-mail typed, so one account is limited per client. */
export function makeLoginKey(ip: string, email: unknown) {
  const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
  return `${ipKeyGenerator(ip)}|${normalized}`;
}

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
    keyGenerator: (req) => makeLoginKey(req.ip ?? '', req.body?.email),
    handler: (_req, _res, next) => next(new RateLimitedError()),
  });
}
