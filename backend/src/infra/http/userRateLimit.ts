import { UnauthorizedError } from '../../shared/errors/AppError';
import { makeRateLimit } from './makeRateLimit';

/**
 * Limits requests per minute for each authenticated user. It must run after `authenticate`: the key is the
 * user of the token, so a client cannot dodge it by changing address, and a person behind a shared address
 * does not use up someone else's quota. The counters live in this process's memory.
 */
export function makeUserRateLimit(maxPerMinute: number) {
  return makeRateLimit(maxPerMinute, {
    keyGenerator: (req) => {
      if (!req.auth) throw new UnauthorizedError();
      return req.auth.userId;
    },
  });
}
