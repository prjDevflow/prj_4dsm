import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import type { ILogger } from '../../providers/ILogger';
import { AppError, ValidationError, type ErrorDetails } from '../../shared/errors/AppError';

interface ErrorHandlerOptions {
  logger: ILogger;
  exposeStack: boolean;
}

// body-parser marks malformed JSON with this type.
const isMalformedJson = (error: unknown) =>
  error instanceof SyntaxError && (error as { type?: string }).type === 'entity.parse.failed';

function toAppError(error: unknown): AppError | undefined {
  if (error instanceof AppError) return error;
  if (error instanceof ZodError) {
    const details: ErrorDetails = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return new ValidationError('Dados inválidos', details);
  }
  if (isMalformedJson(error)) return new ValidationError('JSON malformado no corpo da requisição');
  return undefined;
}

export function makeErrorHandler({ logger, exposeStack }: ErrorHandlerOptions) {
  // Express recognizes error handlers by arity, so all four parameters must stay.
  return (error: unknown, req: Request, res: Response, _next: NextFunction) => {
    const appError = toAppError(error);

    if (appError) {
      return res.status(appError.status).json({
        error: {
          code: appError.code,
          message: appError.message,
          ...(appError.details && { details: appError.details }),
        },
      });
    }

    const stack = error instanceof Error ? error.stack : String(error);
    logger.error('Erro não tratado', { requestId: req.requestId, stack });

    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor',
        ...(exposeStack && { stack }),
      },
    });
  };
}
