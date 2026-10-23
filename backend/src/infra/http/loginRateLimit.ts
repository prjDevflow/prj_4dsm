import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { RateLimitedError } from '../../shared/errors/AppError';

// This runs before body validation, so the key must not grow with a 100 kb body (254 is the e-mail limit).
const MAX_EMAIL_LENGTH = 254;

/** The counter key: client IP plus the e-mail typed, so one account is limited per client. */
export function makeLoginKey(ip: string, email: unknown) {
  const normalized =
    typeof email === 'string' ? email.trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH) : '';
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
