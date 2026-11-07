import type { NfcTag } from '../../../entities/NfcTag';
import { normalizeUid } from '../../../entities/rules/normalizeUid';
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

  async execute(input: ICreateNfcTagDTO): Promise<NfcTag> {
    void this.users;
    const tag: NfcTag = {
      id: this.ids.next(),
      usuarioId: input.usuarioId,
      uid: normalizeUid(input.uid) as string,
      descricao: input.descricao ?? null,
      ativa: true,
      criadaEm: this.clock.now(),
    };
    await this.tags.save(tag);
    return tag;
  }
}
