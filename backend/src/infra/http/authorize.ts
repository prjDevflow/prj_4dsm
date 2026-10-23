import type { RequestHandler } from 'express';
import type { UserProfile } from '../../entities/User';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors/AppError';

/** Must run after `authenticate`, which sets `req.auth`. */
export function authorize(...perfis: UserProfile[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) throw new UnauthorizedError();
    if (!perfis.includes(req.auth.perfil)) throw new ForbiddenError();
    next();
  };
}
