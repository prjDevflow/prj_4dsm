import { ipKeyGenerator } from 'express-rate-limit';
import { makeRateLimit } from './makeRateLimit';

/**
 * Limits requests per minute for each client IP on the public routes (`/health` and `/ready`, which
 * monitors poll). Routes that share one limiter share the quota. The counters live in this process's memory.
 */
export function makePublicRateLimit(maxPerMinute: number) {
  return makeRateLimit(maxPerMinute, { keyGenerator: (req) => ipKeyGenerator(req.ip ?? '') });
}
