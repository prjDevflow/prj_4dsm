import { rateLimit, type Options } from 'express-rate-limit';
import { RateLimitedError } from '../../shared/errors/AppError';

type Variable = Pick<Options, 'keyGenerator'> &
  Partial<Pick<Options, 'skipSuccessfulRequests' | 'requestWasSuccessful'>>;

/**
 * The rate limiter every route group uses: a one-minute window, the standard `RateLimit` and
 * `Retry-After` headers, and a 429 in the API's own error format. Each limiter passes its own
 * `keyGenerator` (who is being counted) and keeps it inline: the library reads the function's source
 * to warn about IPv6 keys, so a key built from `req.ip` has to call `ipKeyGenerator` right there.
 * The counters live in this process's memory.
 */
export function makeRateLimit(maxPerMinute: number, options: Variable) {
  return rateLimit({
    windowMs: 60_000,
    limit: maxPerMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new RateLimitedError()),
    ...options,
  });
}
