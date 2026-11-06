import type { Request, Response } from 'express';
import { parseIdParam } from '../../../shared/idParam';
import { EnableEnrollModeSchema } from './EnableEnrollMode_DTO';
import type { EnableEnrollModeUseCase } from './EnableEnrollMode_UseCase';

export class EnableEnrollModeController {
  constructor(private useCase: EnableEnrollModeUseCase) {}

  async handle(req: Request, res: Response) {
    const id = parseIdParam(req.params.id, 'Terminal não encontrado');
    const data = EnableEnrollModeSchema.parse(req.body);
    return res.status(200).json(await this.useCase.execute(id, data));
  }
}
