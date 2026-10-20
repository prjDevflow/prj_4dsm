import type { RequestHandler } from 'express';
import type { AuthenticateUserUseCase } from '../../useCases/Auth/AuthenticateUser/AuthenticateUser_UseCase';

export interface AuthenticateOptions {
  allowInactive?: boolean;
}

export function makeAuthenticate(_useCase: AuthenticateUserUseCase) {
  return (_options: AuthenticateOptions = {}): RequestHandler =>
    (_req, _res, next) =>
      next();
}
