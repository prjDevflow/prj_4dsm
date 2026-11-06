import type { NfcTag } from '../../../entities/NfcTag';
import { normalizeUid } from '../../../entities/rules/normalizeUid';
import type { IClock } from '../../../providers/IClock';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { INfcTagRepository } from '../../../repositories/INfcTagRepository';
import type { IUserRepository } from '../../../repositories/IUserRepository';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { toNfcTagView, type NfcTagView } from '../nfcTagView';
import type { ICreateNfcTagDTO } from './CreateNfcTag_DTO';

export class CreateNfcTagUseCase {
  constructor(
    private tags: INfcTagRepository,
    private users: IUserRepository,
    private ids: IIdGenerator,
    private clock: IClock,
  ) {}

  async execute(input: ICreateNfcTagDTO): Promise<NfcTagView> {
    const uid = normalizeUid(input.uid);
    if (!uid) {
      throw new ValidationError('Dados inválidos', [
        { field: 'uid', message: 'deve ter de 8 a 20 caracteres hexadecimais' },
      ]);
    }

    const user = await this.users.findById(input.usuarioId);
    if (!user) throw new NotFoundError('Usuário não encontrado');
    if (!user.ativo) {
      throw new ValidationError('Dados inválidos', [
        { field: 'usuarioId', message: 'Usuário inativo' },
      ]);
    }

    if (await this.tags.findByUid(uid)) {
      throw new ConflictError('TAG_JA_CADASTRADA', 'Esta tag já está vinculada a alguém');
    }

    const tag: NfcTag = {
      id: this.ids.next(),
      usuarioId: user.id,
      uid,
      descricao: input.descricao ?? null,
      ativa: true,
      criadaEm: this.clock.now(),
    };
    await this.tags.save(tag);
    return toNfcTagView({ tag, usuario: { id: user.id, nome: user.nome } });
  }
}
