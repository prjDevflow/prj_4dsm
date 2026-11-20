import type { NfcTag } from '../../../entities/NfcTag';
import type { INfcTagRepository } from '../../../repositories/INfcTagRepository';
import { NotFoundError } from '../../../shared/errors/AppError';
import type { IUpdateNfcTagDTO } from './UpdateNfcTag_DTO';

export class UpdateNfcTagUseCase {
  constructor(private tags: INfcTagRepository) {}

  async execute(id: string, input: IUpdateNfcTagDTO): Promise<NfcTag> {
    // Only `ativa` is written, so the UID and the owner can never change through here.
    const updated = await this.tags.updateStatus(id, input.ativa);
    if (!updated) throw new NotFoundError('Tag não encontrada');
    return updated;
  }
}
