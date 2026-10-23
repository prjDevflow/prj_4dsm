import type { Request, Response } from 'express';
import type { GetCurrentUserUseCase } from './GetCurrentUser_UseCase';

export class GetCurrentUserController {
  constructor(private useCase: GetCurrentUserUseCase) {}

  async handle(req: Request, res: Response) {
    // `authenticate` runs first on this route and always sets req.auth.
    return res.status(200).json(await this.useCase.execute(req.auth!.userId));
  }
}
