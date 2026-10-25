import type { Request, Response } from 'express';
import { parseIdParam } from '../../../shared/idParam';
import { UpdateTerminalSchema } from './UpdateTerminal_DTO';
import type { UpdateTerminalUseCase } from './UpdateTerminal_UseCase';

export class UpdateTerminalController {
  constructor(private useCase: UpdateTerminalUseCase) {}

  async handle(req: Request, res: Response) {
    const id = parseIdParam(req.params.id, 'Terminal não encontrado');
    const data = UpdateTerminalSchema.parse(req.body);
    return res.status(200).json(await this.useCase.execute(id, data));
  }
}
