import type { NfcTag } from '../../../entities/NfcTag';
import type { INfcTagRepository } from '../../../repositories/INfcTagRepository';
import type { IUpdateNfcTagDTO } from './UpdateNfcTag_DTO';

export class UpdateNfcTagUseCase {
  constructor(private tags: INfcTagRepository) {}

  async execute(_id: string, _input: IUpdateNfcTagDTO): Promise<NfcTag> {
    void this.tags;
    throw new Error('UpdateNfcTag ainda não implementado');
  }
}
