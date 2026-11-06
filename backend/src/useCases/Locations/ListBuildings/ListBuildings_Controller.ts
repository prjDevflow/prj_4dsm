import type { Request, Response } from 'express';
import { ListBuildingsSchema } from './ListBuildings_DTO';
import type { ListBuildingsUseCase } from './ListBuildings_UseCase';

export class ListBuildingsController {
  constructor(private useCase: ListBuildingsUseCase) {}

  async handle(req: Request, res: Response) {
    const filter = ListBuildingsSchema.parse(req.query);
    return res.status(200).json(await this.useCase.execute(filter));
  }
}
