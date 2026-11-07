import type { Request, Response } from 'express';
import { CreateNfcTagSchema } from './CreateNfcTag_DTO';
import type { CreateNfcTagUseCase } from './CreateNfcTag_UseCase';

export class CreateNfcTagController {
  constructor(private useCase: CreateNfcTagUseCase) {}

  async handle(req: Request, res: Response) {
    const data = CreateNfcTagSchema.parse(req.body);
    return res.status(201).json(await this.useCase.execute(data));
  }
}
