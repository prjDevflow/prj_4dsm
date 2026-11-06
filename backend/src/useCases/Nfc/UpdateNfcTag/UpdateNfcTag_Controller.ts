import type { Request, Response } from 'express';
import { parseIdParam } from '../../../shared/idParam';
import { UpdateNfcTagSchema } from './UpdateNfcTag_DTO';
import type { UpdateNfcTagUseCase } from './UpdateNfcTag_UseCase';

export class UpdateNfcTagController {
  constructor(private useCase: UpdateNfcTagUseCase) {}

  async handle(req: Request, res: Response) {
    const id = parseIdParam(req.params.id, 'Tag não encontrada');
    const data = UpdateNfcTagSchema.parse(req.body);
    return res.status(200).json(await this.useCase.execute(id, data));
  }
}
