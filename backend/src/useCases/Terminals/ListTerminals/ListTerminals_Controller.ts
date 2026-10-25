import type { Request, Response } from 'express';
import { ListTerminalsSchema } from './ListTerminals_DTO';
import type { ListTerminalsUseCase } from './ListTerminals_UseCase';

export class ListTerminalsController {
  constructor(private useCase: ListTerminalsUseCase) {}

  async handle(req: Request, res: Response) {
    const filter = ListTerminalsSchema.parse(req.query);
    return res.status(200).json(await this.useCase.execute(filter));
  }
}
