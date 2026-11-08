import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { RateLimitedError } from '../../shared/errors/AppError';

/**
 * Limits failed terminal authentications per IP. It runs before `authenticateTerminal` and only counts
 * the answers that mean "wrong credentials" (401 and 403): a terminal that gets the key right does not
 * spend the quota, and other errors (422, 500...) do not either. Once an IP is over the limit, every
 * request from it gets 429 until the minute ends, even with a right key: that is what stops key guessing,
 * and it also means a terminal sharing an address with an attacker waits too. The counters live in this
 * process's memory.
 */
export function makeTerminalAuthFailLimit(maxPerMinute: number) {
  return rateLimit({
    windowMs: 60_000,
    limit: maxPerMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
    skipSuccessfulRequests: true,
    requestWasSuccessful: (_req, res) => res.statusCode !== 401 && res.statusCode !== 403,
    handler: (_req, _res, next) => next(new RateLimitedError()),
  });
}
