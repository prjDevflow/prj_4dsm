import type { Request, Response } from 'express';
import { CreateBuildingSchema } from './CreateBuilding_DTO';
import type { CreateBuildingUseCase } from './CreateBuilding_UseCase';

export class CreateBuildingController {
  constructor(private useCase: CreateBuildingUseCase) {}

  async handle(req: Request, res: Response) {
    const data = CreateBuildingSchema.parse(req.body);
    return res.status(201).json(await this.useCase.execute(data));
  }
}
