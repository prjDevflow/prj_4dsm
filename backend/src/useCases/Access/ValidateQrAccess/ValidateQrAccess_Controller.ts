import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../../shared/errors/AppError';
import { QR_DENIAL_MESSAGES, QR_GRANTED_MESSAGE } from '../qrDenialMessages';
import { ValidateQrAccessSchema } from './ValidateQrAccess_DTO';
import type { ValidateQrAccessUseCase } from './ValidateQrAccess_UseCase';

export class ValidateQrAccessController {
  constructor(private useCase: ValidateQrAccessUseCase) {}

  async handle(req: Request, res: Response) {
    // `authenticate` runs first; this only guards against a route mounted without it.
    if (!req.auth) throw new UnauthorizedError();
    const body = ValidateQrAccessSchema.parse(req.body);

    const decision = await this.useCase.execute({ userId: req.auth.userId, ...body });

    // A denial is an answer, not a failure of the request: 403 with the reason as the error code.
    if (!decision.granted) {
      return res.status(403).json({
        error: { code: decision.reason, message: QR_DENIAL_MESSAGES[decision.reason] },
      });
    }
    return res.status(200).json({
      resultado: 'AUTORIZADO',
      mensagem: QR_GRANTED_MESSAGE,
      local: decision.local,
      usosRestantes: decision.usosRestantes,
      distanciaM: Math.round(decision.distanceM),
      // To the second, like the contract example (and the heartbeat's serverTime).
      ocorridoEm: decision.ocorridoEm.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    });
  }
}
