import type { INfcTagRepository } from '../../../repositories/INfcTagRepository';
import type { NfcTagView } from '../nfcTagView';
import type { IUpdateNfcTagDTO } from './UpdateNfcTag_DTO';

export class UpdateNfcTagUseCase {
  constructor(private tags: INfcTagRepository) {}

  async execute(_id: string, _input: IUpdateNfcTagDTO): Promise<NfcTagView> {
    throw new Error('não implementado');
  }
}
