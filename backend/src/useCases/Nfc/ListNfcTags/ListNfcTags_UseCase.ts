import type { NfcTag } from '../../../entities/NfcTag';
import type { INfcTagRepository } from '../../../repositories/INfcTagRepository';
import type { Page } from '../../../shared/pagination';
import type { IListNfcTagsDTO } from './ListNfcTags_DTO';

export class ListNfcTagsUseCase {
  constructor(private tags: INfcTagRepository) {}

  async execute(input: IListNfcTagsDTO): Promise<Page<NfcTag>> {
    const { items, total } = await this.tags.list(input);
    return { data: items, page: input.page, pageSize: input.pageSize, total };
  }
}
