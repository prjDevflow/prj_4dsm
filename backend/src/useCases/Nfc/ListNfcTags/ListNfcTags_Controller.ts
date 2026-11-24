import type { Request, Response } from 'express';
import { ListNfcTagsSchema } from './ListNfcTags_DTO';
import type { ListNfcTagsUseCase } from './ListNfcTags_UseCase';

export class ListNfcTagsController {
  constructor(private useCase: ListNfcTagsUseCase) {}

  async handle(req: Request, res: Response) {
    const filter = ListNfcTagsSchema.parse(req.query);
    return res.status(200).json(await this.useCase.execute(filter));
  }
}
