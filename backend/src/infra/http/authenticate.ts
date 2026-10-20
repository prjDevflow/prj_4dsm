import type { RequestHandler } from 'express';
import type { AuthenticateUserUseCase } from '../../useCases/Auth/AuthenticateUser/AuthenticateUser_UseCase';

export interface AuthenticateOptions {
  allowInactive?: boolean;
}

const BEARER = /^Bearer\s+(\S+)$/i;

/** Reads `Authorization: Bearer <jwt>`; any other scheme counts as "no token". */
const readBearerToken = (header: string | undefined) => header?.match(BEARER)?.[1];

export function makeAuthenticate(useCase: AuthenticateUserUseCase) {
  return ({ allowInactive = false }: AuthenticateOptions = {}): RequestHandler =>
    async (req, _res, next) => {
      req.auth = await useCase.execute({
        token: readBearerToken(req.headers.authorization),
        allowInactive,
      });
      next();
    };
}
