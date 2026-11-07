import type { NfcTag } from '../../../entities/NfcTag';
import type { INfcTagRepository } from '../../../repositories/INfcTagRepository';
import type { Page } from '../../../shared/pagination';
import type { IListNfcTagsDTO } from './ListNfcTags_DTO';

export class ListNfcTagsUseCase {
  constructor(private tags: INfcTagRepository) {}

  async execute(_input: IListNfcTagsDTO): Promise<Page<NfcTag>> {
    void this.tags;
    throw new Error('ListNfcTags ainda não implementado');
  }
}
