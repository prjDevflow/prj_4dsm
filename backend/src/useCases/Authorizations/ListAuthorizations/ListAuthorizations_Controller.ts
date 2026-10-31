import type { Request, Response } from 'express';
import { ListAuthorizationsSchema } from './ListAuthorizations_DTO';
import type { ListAuthorizationsUseCase } from './ListAuthorizations_UseCase';

export class ListAuthorizationsController {
  constructor(private useCase: ListAuthorizationsUseCase) {}

  async handle(req: Request, res: Response) {
    const filter = ListAuthorizationsSchema.parse(req.query);
    return res.status(200).json(await this.useCase.execute(filter));
  }
}
