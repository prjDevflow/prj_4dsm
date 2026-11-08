import type { RequestHandler } from 'express';

/** Limits requests per minute for each IP on the public routes. Not implemented yet. */
export function makePublicRateLimit(_maxPerMinute: number): RequestHandler {
  return () => {
    throw new Error('não implementado');
  };
}
