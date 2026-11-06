import type { Request, Response } from 'express';
import { parseIdParam } from '../../../shared/idParam';
import { UpdateUserSchema } from './UpdateUser_DTO';
import type { UpdateUserUseCase } from './UpdateUser_UseCase';

export class UpdateUserController {
  constructor(private useCase: UpdateUserUseCase) {}

  async handle(req: Request, res: Response) {
    const id = parseIdParam(req.params.id, 'Usuário não encontrado');
    const data = UpdateUserSchema.parse(req.body);
    // `authenticate` runs first on this route and always sets req.auth.
    return res.status(200).json(await this.useCase.execute(id, data, req.auth!.userId));
  }
}
