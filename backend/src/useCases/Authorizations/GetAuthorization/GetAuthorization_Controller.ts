import type { Request, Response } from 'express';
import { parseIdParam } from '../../../shared/idParam';
import type { GetAuthorizationUseCase } from './GetAuthorization_UseCase';

export class GetAuthorizationController {
  constructor(private useCase: GetAuthorizationUseCase) {}

  async handle(req: Request, res: Response) {
    const id = parseIdParam(req.params.id, 'Autorização não encontrada');
    return res.status(200).json(await this.useCase.execute(id));
  }
}
