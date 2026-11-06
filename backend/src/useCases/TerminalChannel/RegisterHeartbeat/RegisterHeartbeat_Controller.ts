import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../../shared/errors/AppError';
import { RegisterHeartbeatSchema } from './RegisterHeartbeat_DTO';
import type { RegisterHeartbeatUseCase } from './RegisterHeartbeat_UseCase';

export class RegisterHeartbeatController {
  constructor(private useCase: RegisterHeartbeatUseCase) {}

  async handle(req: Request, res: Response) {
    // `authenticateTerminal` runs first; this only guards against a route mounted without it.
    if (!req.terminal) throw new UnauthorizedError('Credenciais do terminal inválidas');
    const data = RegisterHeartbeatSchema.parse(req.body);
    return res.status(200).json(await this.useCase.execute(req.terminal.terminalId, data));
  }
}
