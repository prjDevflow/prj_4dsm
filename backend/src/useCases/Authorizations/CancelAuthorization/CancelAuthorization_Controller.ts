import type { Request, Response } from 'express';
import { parseIdParam } from '../../../shared/idParam';
import { CancelAuthorizationSchema } from './CancelAuthorization_DTO';
import type { CancelAuthorizationUseCase } from './CancelAuthorization_UseCase';

export class CancelAuthorizationController {
  constructor(private useCase: CancelAuthorizationUseCase) {}

  async handle(req: Request, res: Response) {
    const id = parseIdParam(req.params.id, 'Autorização não encontrada');
    // The body is optional: a request without one arrives here with `req.body` undefined.
    const data = CancelAuthorizationSchema.parse(req.body ?? {});
    // `authorize('ADMIN')` runs before this, so `req.auth` is set.
    return res.status(200).json(await this.useCase.execute(id, data, req.auth!.userId));
  }
}
