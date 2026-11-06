import type { Request, Response } from 'express';
import { CreateAccessPointSchema } from './CreateAccessPoint_DTO';
import type { CreateAccessPointUseCase } from './CreateAccessPoint_UseCase';

export class CreateAccessPointController {
  constructor(private useCase: CreateAccessPointUseCase) {}

  async handle(req: Request, res: Response) {
    const data = CreateAccessPointSchema.parse(req.body);
    return res.status(201).json(await this.useCase.execute(data));
  }
}
