import type { NfcTag } from '../../../entities/NfcTag';
import { normalizeUid } from '../../../entities/rules/normalizeUid';
import type { IClock } from '../../../providers/IClock';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { INfcTagRepository } from '../../../repositories/INfcTagRepository';
import type { IUserRepository } from '../../../repositories/IUserRepository';
import { ValidationError } from '../../../shared/errors/AppError';
import { requireActiveUser } from '../requireActiveUser';
import { UID_MESSAGE } from '../uidField';
import type { ICreateNfcTagDTO } from './CreateNfcTag_DTO';

export class CreateNfcTagUseCase {
  constructor(
    private users: IUserRepository,
    private tags: INfcTagRepository,
    private ids: IIdGenerator,
    private clock: IClock,
  ) {}

  async execute(input: ICreateNfcTagDTO): Promise<NfcTag> {
    // The edge already checks the UID; this keeps the rule even for a caller that skips it.
    const uid = normalizeUid(input.uid);
    if (!uid)
      throw new ValidationError('Dados inválidos', [{ field: 'uid', message: UID_MESSAGE }]);

    // No lock on the user, unlike CreateAuthorization: a deactivation committed right after this read leaves a
    // tag of an inactive user, which is harmless because the NFC validation (B17) checks `ativo` on every read.
    const user = await requireActiveUser(this.users, input.usuarioId);

    const tag: NfcTag = {
      id: this.ids.next(),
      usuarioId: user.id,
      uid,
      descricao: input.descricao ?? null,
      ativa: true,
      criadaEm: this.clock.now(),
    };
    // A repeated UID is a 409 thrown by the store, whose unique index also settles simultaneous requests.
    await this.tags.save(tag);
    return tag;
  }
}
