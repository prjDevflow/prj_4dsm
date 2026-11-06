import type { Request, Response } from 'express';
import { ListUsersSchema } from './ListUsers_DTO';
import type { ListUsersUseCase } from './ListUsers_UseCase';

export class ListUsersController {
  constructor(private useCase: ListUsersUseCase) {}

  async handle(req: Request, res: Response) {
    const filter = ListUsersSchema.parse(req.query);
    return res.status(200).json(await this.useCase.execute(filter));
  }
}
