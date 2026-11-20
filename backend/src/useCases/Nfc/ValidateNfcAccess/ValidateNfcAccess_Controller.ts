import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../../shared/errors/AppError';
import { ValidateNfcAccessSchema } from './ValidateNfcAccess_DTO';
import type { ValidateNfcAccessUseCase } from './ValidateNfcAccess_UseCase';

export class ValidateNfcAccessController {
  constructor(private useCase: ValidateNfcAccessUseCase) {}

  async handle(req: Request, res: Response) {
    // `authenticateTerminal` runs first; this only guards against a route mounted without it.
    if (!req.terminal) throw new UnauthorizedError('Credenciais do terminal inválidas');
    const data = ValidateNfcAccessSchema.parse({
      ...req.body,
      'Idempotency-Key': req.header('idempotency-key'),
    });
    // Always 200: the decision, granted or denied, is the body (doc 03, section 4.5).
    const decision = await this.useCase.execute({
      terminalId: req.terminal.terminalId,
      uid: data.uid,
      idempotencyKey: data['Idempotency-Key'],
    });
    return res.status(200).json(decision);
  }
}
