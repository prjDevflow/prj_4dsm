import { rateLimit } from 'express-rate-limit';
import { RateLimitedError, UnauthorizedError } from '../../shared/errors/AppError';

/**
 * Limits requests per minute for each authenticated terminal, summed over all its routes. It must run
 * after `authenticateTerminal`: the key is the terminal's id, so a terminal cannot dodge it by changing
 * address, and terminals behind one address do not share a quota. The counters live in this process's memory.
 */
export function makeTerminalRateLimit(maxPerMinute: number) {
  return rateLimit({
    windowMs: 60_000,
    limit: maxPerMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => {
      if (!req.terminal) throw new UnauthorizedError();
      return req.terminal.terminalId;
    },
    handler: (_req, _res, next) => next(new RateLimitedError()),
  });
}
