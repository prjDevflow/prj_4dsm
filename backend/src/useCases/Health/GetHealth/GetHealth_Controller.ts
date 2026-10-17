import type { Request, Response } from 'express';
import type { GetHealthUseCase } from './GetHealth_UseCase';

export class GetHealthController {
  constructor(private useCase: GetHealthUseCase) {}

  async handle(_req: Request, res: Response) {
    return res.status(200).json(this.useCase.execute());
  }
}
