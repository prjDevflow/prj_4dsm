import type { INfcTagRepository } from '../../../repositories/INfcTagRepository';
import type { Page } from '../../../shared/pagination';
import type { NfcTagView } from '../nfcTagView';
import type { IListNfcTagsDTO } from './ListNfcTags_DTO';

export class ListNfcTagsUseCase {
  constructor(private tags: INfcTagRepository) {}

  async execute(_input: IListNfcTagsDTO): Promise<Page<NfcTagView>> {
    throw new Error('não implementado');
  }
}
