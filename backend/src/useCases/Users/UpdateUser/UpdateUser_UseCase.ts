import type { User } from '../../../entities/User';
import type { IClock } from '../../../providers/IClock';
import type { IHashProvider } from '../../../providers/IHashProvider';
import type { IUserRepository } from '../../../repositories/IUserRepository';
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError';
import { toUserView, type UserView } from '../userView';
import type { IUpdateUserDTO } from './UpdateUser_DTO';

export class UpdateUserUseCase {
  constructor(
    private users: IUserRepository,
    private hash: IHashProvider,
    private clock: IClock,
  ) {}

  async execute(id: string, input: IUpdateUserDTO, actorId: string): Promise<UserView> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('Usuário não encontrado');

    await this.assertAdminStaysInPlace(user, input, actorId);

    const updated: User = {
      ...user,
      nome: input.nome ?? user.nome,
      perfil: input.perfil ?? user.perfil,
      ativo: input.ativo ?? user.ativo,
      senhaHash: input.senha === undefined ? user.senhaHash : await this.hash.hash(input.senha),
      atualizadoEm: this.clock.now(),
    };
    await this.users.save(updated);
    return toUserView(updated);
  }

  /** Nobody locks themselves out, and the system never ends up without an active administrator. */
  private async assertAdminStaysInPlace(user: User, input: IUpdateUserDTO, actorId: string) {
    const deactivates = input.ativo === false && user.ativo;
    const changesProfile = input.perfil !== undefined && input.perfil !== user.perfil;

    if (user.id === actorId && (deactivates || changesProfile)) {
      throw new ConflictError(
        'AUTO_DESATIVACAO',
        'Você não pode desativar a si mesmo nem alterar o seu próprio perfil',
      );
    }

    const losesAdminRole = user.perfil === 'ADMIN' && user.ativo && (deactivates || changesProfile);
    if (losesAdminRole && (await this.users.countActiveAdmins()) <= 1) {
      throw new ConflictError(
        'ULTIMO_ADMIN',
        'O sistema precisa de ao menos um administrador ativo',
      );
    }
  }
}
