import type { Request, Response } from 'express';
import { CreateAuthorizationSchema } from './CreateAuthorization_DTO';
import type { CreateAuthorizationUseCase } from './CreateAuthorization_UseCase';

export class CreateAuthorizationController {
  constructor(private useCase: CreateAuthorizationUseCase) {}

  async handle(req: Request, res: Response) {
    const data = CreateAuthorizationSchema.parse(req.body);
    // `authorize('ADMIN')` runs before this, so `req.auth` is set.
    return res.status(201).json(await this.useCase.execute(data, req.auth!.userId));
  }
}
