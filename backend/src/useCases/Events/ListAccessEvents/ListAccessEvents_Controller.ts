import type { Request, Response } from 'express';
import { ListAccessEventsSchema } from './ListAccessEvents_DTO';
import type { ListAccessEventsUseCase } from './ListAccessEvents_UseCase';

export class ListAccessEventsController {
  constructor(private useCase: ListAccessEventsUseCase) {}

  async handle(req: Request, res: Response) {
    const filter = ListAccessEventsSchema.parse(req.query);
    return res.status(200).json(await this.useCase.execute(filter));
  }
}
