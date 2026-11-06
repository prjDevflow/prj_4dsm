import type { Request, Response } from 'express';
import { CreateUserSchema } from './CreateUser_DTO';
import type { CreateUserUseCase } from './CreateUser_UseCase';

export class CreateUserController {
  constructor(private useCase: CreateUserUseCase) {}

  async handle(req: Request, res: Response) {
    const data = CreateUserSchema.parse(req.body);
    return res.status(201).json(await this.useCase.execute(data));
  }
}
