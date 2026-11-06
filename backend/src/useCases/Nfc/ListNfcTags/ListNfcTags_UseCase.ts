import type { INfcTagRepository } from '../../../repositories/INfcTagRepository';
import type { Page } from '../../../shared/pagination';
import { toNfcTagView, type NfcTagView } from '../nfcTagView';
import type { IListNfcTagsDTO } from './ListNfcTags_DTO';

export class ListNfcTagsUseCase {
  constructor(private tags: INfcTagRepository) {}

  async execute(input: IListNfcTagsDTO): Promise<Page<NfcTagView>> {
    const { items, total } = await this.tags.list(input);
    return {
      data: items.map(toNfcTagView),
      page: input.page,
      pageSize: input.pageSize,
      total,
    };
  }
}
