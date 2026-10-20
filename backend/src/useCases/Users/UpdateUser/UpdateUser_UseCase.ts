import type { IClock } from '../../../providers/IClock';
import type { IHashProvider } from '../../../providers/IHashProvider';
import type { IUserRepository } from '../../../repositories/IUserRepository';
import { NotFoundError } from '../../../shared/errors/AppError';
import { toUserView, type UserView } from '../userView';
import type { IUpdateUserDTO } from './UpdateUser_DTO';

export class UpdateUserUseCase {
  constructor(
    private users: IUserRepository,
    private hash: IHashProvider,
    private clock: IClock,
  ) {}

  async execute(id: string, input: IUpdateUserDTO, _actorId: string): Promise<UserView> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('Usuário não encontrado');

    const updated = {
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
}
