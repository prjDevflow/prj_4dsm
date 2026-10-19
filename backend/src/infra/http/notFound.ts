import type { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '../../shared/errors/AppError';

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new NotFoundError('Rota não encontrada'));
}
