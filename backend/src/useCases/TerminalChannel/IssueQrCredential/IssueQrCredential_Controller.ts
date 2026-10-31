import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../../shared/errors/AppError';
import type { IssueQrCredentialUseCase } from './IssueQrCredential_UseCase';

export class IssueQrCredentialController {
  constructor(private useCase: IssueQrCredentialUseCase) {}

  async handle(req: Request, res: Response) {
    // `authenticateTerminal` runs first; this only guards against a route mounted without it.
    if (!req.terminal) throw new UnauthorizedError('Credenciais do terminal inválidas');
    return res.status(200).json(await this.useCase.execute(req.terminal.terminalId));
  }
}
