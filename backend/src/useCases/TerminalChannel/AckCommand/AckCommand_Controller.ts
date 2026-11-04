import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../../shared/errors/AppError';
import { parseCommandIdParam } from './AckCommand_DTO';
import type { AckCommandUseCase } from './AckCommand_UseCase';

export class AckCommandController {
  constructor(private useCase: AckCommandUseCase) {}

  async handle(req: Request, res: Response) {
    // `authenticateTerminal` runs first; this only guards against a route mounted without it.
    if (!req.terminal) throw new UnauthorizedError('Credenciais do terminal inválidas');
    const commandId = parseCommandIdParam(req.params.id);
    await this.useCase.execute(req.terminal.terminalId, commandId);
    return res.status(204).send();
  }
}
