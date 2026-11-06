import type { Request, Response } from 'express';
import { parseIdParam } from '../../../shared/idParam';
import { UpdateAccessPointSchema } from './UpdateAccessPoint_DTO';
import type { UpdateAccessPointUseCase } from './UpdateAccessPoint_UseCase';

export class UpdateAccessPointController {
  constructor(private useCase: UpdateAccessPointUseCase) {}

  async handle(req: Request, res: Response) {
    const id = parseIdParam(req.params.id, 'Ponto de acesso não encontrado');
    const data = UpdateAccessPointSchema.parse(req.body);
    return res.status(200).json(await this.useCase.execute(id, data));
  }
}
