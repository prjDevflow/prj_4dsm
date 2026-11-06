import type { Request, Response } from 'express';
import { parseIdParam } from '../../../shared/idParam';
import type { RotateTerminalKeyUseCase } from './RotateTerminalKey_UseCase';

export class RotateTerminalKeyController {
  constructor(private useCase: RotateTerminalKeyUseCase) {}

  async handle(req: Request, res: Response) {
    const id = parseIdParam(req.params.id, 'Terminal não encontrado');
    return res.status(200).json(await this.useCase.execute(id));
  }
}
