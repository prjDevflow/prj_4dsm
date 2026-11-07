import type { NfcTag } from '../../../entities/NfcTag';
import type { IClock } from '../../../providers/IClock';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { INfcTagRepository } from '../../../repositories/INfcTagRepository';
import type { IUserRepository } from '../../../repositories/IUserRepository';
import type { ICreateNfcTagDTO } from './CreateNfcTag_DTO';

export class CreateNfcTagUseCase {
  constructor(
    private users: IUserRepository,
    private tags: INfcTagRepository,
    private ids: IIdGenerator,
    private clock: IClock,
  ) {}

  async execute(_input: ICreateNfcTagDTO): Promise<NfcTag> {
    void this.users;
    void this.tags;
    void this.ids;
    void this.clock;
    throw new Error('CreateNfcTag ainda não implementado');
  }
}
