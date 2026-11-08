import type { RequestHandler } from 'express';

/** Limits requests per minute for each authenticated terminal. Not implemented yet. */
export function makeTerminalRateLimit(_maxPerMinute: number): RequestHandler {
  return () => {
    throw new Error('não implementado');
  };
}
