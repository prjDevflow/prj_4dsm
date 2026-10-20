import { AppError, UnauthorizedError } from '../../shared/errors/AppError';

// Same message for unknown e-mail and wrong password, so the response does not reveal which one failed.
export class InvalidCredentialsError extends AppError {
  constructor() {
    super('CREDENCIAIS_INVALIDAS', 'E-mail ou senha inválidos', 401);
  }
}

export class InactiveUserError extends AppError {
  constructor() {
    super('USUARIO_INATIVO', 'Usuário inativo', 403);
  }
}

export class InvalidSessionError extends UnauthorizedError {
  constructor() {
    super('Token ausente, inválido ou expirado');
  }
}
