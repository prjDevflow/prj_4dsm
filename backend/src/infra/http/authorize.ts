import type { RequestHandler } from 'express';
import type { UserProfile } from '../../entities/User';

export function authorize(..._perfis: UserProfile[]): RequestHandler {
  return (_req, _res, next) => next();
}
