import type { NfcTag } from '../../../entities/NfcTag';
import { normalizeUid } from '../../../entities/rules/normalizeUid';
import type { IClock } from '../../../providers/IClock';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { INfcTagRepository } from '../../../repositories/INfcTagRepository';
import type { IUserRepository } from '../../../repositories/IUserRepository';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
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

    const user = await this.users.findById(input.usuarioId);
    if (!user) throw new NotFoundError('Usuário não encontrado');
    if (!user.ativo) {
      throw new ValidationError('Dados inválidos', [
        { field: 'usuarioId', message: 'Usuário inativo' },
      ]);
    }

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
