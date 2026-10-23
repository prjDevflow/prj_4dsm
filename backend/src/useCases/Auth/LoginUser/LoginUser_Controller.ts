import type { Request, Response } from 'express';
import { LoginSchema } from './LoginUser_DTO';
import type { LoginUserUseCase } from './LoginUser_UseCase';

export class LoginUserController {
  constructor(private useCase: LoginUserUseCase) {}

  async handle(req: Request, res: Response) {
    const data = LoginSchema.parse(req.body);
    return res.status(200).json(await this.useCase.execute(data));
  }
}
