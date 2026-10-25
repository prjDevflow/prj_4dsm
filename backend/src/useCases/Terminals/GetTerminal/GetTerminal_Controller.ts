import type { Request, Response } from 'express';
import { parseIdParam } from '../../../shared/idParam';
import type { GetTerminalUseCase } from './GetTerminal_UseCase';

export class GetTerminalController {
  constructor(private useCase: GetTerminalUseCase) {}

  async handle(req: Request, res: Response) {
    const id = parseIdParam(req.params.id, 'Terminal não encontrado');
    return res.status(200).json(await this.useCase.execute(id));
  }
}
