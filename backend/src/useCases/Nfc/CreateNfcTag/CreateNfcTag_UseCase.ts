import type { IClock } from '../../../providers/IClock';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { INfcTagRepository } from '../../../repositories/INfcTagRepository';
import type { IUserRepository } from '../../../repositories/IUserRepository';
import type { NfcTagView } from '../nfcTagView';
import type { ICreateNfcTagDTO } from './CreateNfcTag_DTO';

export class CreateNfcTagUseCase {
  constructor(
    private tags: INfcTagRepository,
    private users: IUserRepository,
    private ids: IIdGenerator,
    private clock: IClock,
  ) {}

  async execute(_input: ICreateNfcTagDTO): Promise<NfcTagView> {
    throw new Error('não implementado');
  }
}
