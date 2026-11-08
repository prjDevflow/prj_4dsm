import type { RequestHandler } from 'express';

/** Limits failed terminal authentications per IP. Not implemented yet. */
export function makeTerminalAuthFailLimit(_maxPerMinute: number): RequestHandler {
  return () => {
    throw new Error('não implementado');
  };
}
