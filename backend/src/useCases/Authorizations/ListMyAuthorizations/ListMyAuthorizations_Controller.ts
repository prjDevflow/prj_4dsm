import type { Request, Response } from 'express';
import { ListMyAuthorizationsSchema } from './ListMyAuthorizations_DTO';
import type { ListMyAuthorizationsUseCase } from './ListMyAuthorizations_UseCase';

export class ListMyAuthorizationsController {
  constructor(private useCase: ListMyAuthorizationsUseCase) {}

  async handle(req: Request, res: Response) {
    const filter = ListMyAuthorizationsSchema.parse(req.query);
    // `authenticate` runs before this, so `req.auth` is set.
    return res.status(200).json(await this.useCase.execute(req.auth!.userId, filter));
  }
}
