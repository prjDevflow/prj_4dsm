import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../../shared/errors/AppError';
import { IngestOfflineEventsSchema } from './IngestOfflineEvents_DTO';
import type { IngestOfflineEventsUseCase } from './IngestOfflineEvents_UseCase';

export class IngestOfflineEventsController {
  constructor(private useCase: IngestOfflineEventsUseCase) {}

  async handle(req: Request, res: Response) {
    // `authenticateTerminal` runs first; this only guards against a route mounted without it.
    if (!req.terminal) throw new UnauthorizedError('Credenciais do terminal inválidas');
    const data = IngestOfflineEventsSchema.parse(req.body);
    const result = await this.useCase.execute({
      terminalId: req.terminal.terminalId,
      events: data.events,
    });
    return res.status(200).json(result);
  }
}
