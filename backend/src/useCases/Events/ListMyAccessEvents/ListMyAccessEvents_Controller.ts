import type { Request, Response } from 'express';
import { ListMyAccessEventsSchema } from './ListMyAccessEvents_DTO';
import type { ListMyAccessEventsUseCase } from './ListMyAccessEvents_UseCase';

export class ListMyAccessEventsController {
  constructor(private useCase: ListMyAccessEventsUseCase) {}

  async handle(req: Request, res: Response) {
    const filter = ListMyAccessEventsSchema.parse(req.query);
    // `authenticate` runs before this, so `req.auth` is set.
    return res.status(200).json(await this.useCase.execute(req.auth!.userId, filter));
  }
}
