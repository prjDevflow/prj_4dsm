import type { INfcTagRepository } from '../../../repositories/INfcTagRepository';
import { NotFoundError } from '../../../shared/errors/AppError';
import { toNfcTagView, type NfcTagView } from '../nfcTagView';
import type { IUpdateNfcTagDTO } from './UpdateNfcTag_DTO';

export class UpdateNfcTagUseCase {
  constructor(private tags: INfcTagRepository) {}

  async execute(id: string, input: IUpdateNfcTagDTO): Promise<NfcTagView> {
    const details = await this.tags.update(id, { ativa: input.ativa });
    if (!details) throw new NotFoundError('Tag não encontrada');
    return toNfcTagView(details);
  }
}
