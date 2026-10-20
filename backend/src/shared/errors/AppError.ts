export type ErrorDetails = Array<{ field: string; message: string }>;

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Dados inválidos', details?: ErrorDetails) {
    super('VALIDATION_ERROR', message, 422, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Autenticação necessária') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Sem permissão para acessar este recurso') {
    super('FORBIDDEN', message, 403);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = 'Muitas tentativas. Aguarde um minuto e tente novamente') {
    super('RATE_LIMITED', message, 429);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super('NOT_FOUND', message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(code, message, 409);
  }
}
