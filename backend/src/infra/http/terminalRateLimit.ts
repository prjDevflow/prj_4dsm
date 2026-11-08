import { UnauthorizedError } from '../../shared/errors/AppError';
import { makeRateLimit } from './makeRateLimit';

/**
 * Limits requests per minute for each authenticated terminal, summed over all its routes. It must run
 * after `authenticateTerminal`: the key is the terminal's id, so a terminal cannot dodge it by changing
 * address, and terminals behind one address do not share a quota. The counters live in this process's memory.
 */
export function makeTerminalRateLimit(maxPerMinute: number) {
  return makeRateLimit(maxPerMinute, {
    keyGenerator: (req) => {
      if (!req.terminal) throw new UnauthorizedError();
      return req.terminal.terminalId;
    },
  });
}
