import type { Request, Response } from 'express';
import { ListAccessPointsSchema } from './ListAccessPoints_DTO';
import type { ListAccessPointsUseCase } from './ListAccessPoints_UseCase';

export class ListAccessPointsController {
  constructor(private useCase: ListAccessPointsUseCase) {}

  async handle(req: Request, res: Response) {
    const filter = ListAccessPointsSchema.parse(req.query);
    return res.status(200).json(await this.useCase.execute(filter));
  }
}
