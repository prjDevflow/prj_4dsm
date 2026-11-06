import type { Request, Response } from 'express';
import { parseIdParam } from '../../../shared/idParam';
import { UpdateBuildingSchema } from './UpdateBuilding_DTO';
import type { UpdateBuildingUseCase } from './UpdateBuilding_UseCase';

export class UpdateBuildingController {
  constructor(private useCase: UpdateBuildingUseCase) {}

  async handle(req: Request, res: Response) {
    const id = parseIdParam(req.params.id, 'Edifício não encontrado');
    const data = UpdateBuildingSchema.parse(req.body);
    return res.status(200).json(await this.useCase.execute(id, data));
  }
}
