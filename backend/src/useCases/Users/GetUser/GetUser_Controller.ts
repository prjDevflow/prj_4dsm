import type { Request, Response } from 'express';
import { parseIdParam } from '../../../shared/idParam';
import type { GetUserUseCase } from './GetUser_UseCase';

export class GetUserController {
  constructor(private useCase: GetUserUseCase) {}

  async handle(req: Request, res: Response) {
    const id = parseIdParam(req.params.id, 'Usuário não encontrado');
    return res.status(200).json(await this.useCase.execute(id));
  }
}
