import { ConflictError } from '../../../shared/errors/AppError';
import type { IClock } from '../../../providers/IClock';
import type { IHashProvider } from '../../../providers/IHashProvider';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { IUserRepository } from '../../../repositories/IUserRepository';
import { toUserView, type UserView } from '../userView';
import type { ICreateUserDTO } from './CreateUser_DTO';

export class CreateUserUseCase {
  constructor(
    private users: IUserRepository,
    private hash: IHashProvider,
    private ids: IIdGenerator,
    private clock: IClock,
  ) {}

  async execute(input: ICreateUserDTO): Promise<UserView> {
    const email = input.email.trim().toLowerCase();
    if (await this.users.existsByEmail(email)) {
      throw new ConflictError('EMAIL_JA_CADASTRADO', 'Já existe um usuário com este e-mail');
    }

    const now = this.clock.now();
    const user = {
      id: this.ids.next(),
      nome: input.nome,
      email,
      senhaHash: await this.hash.hash(input.senha),
      perfil: input.perfil,
      ativo: true,
      criadoEm: now,
      atualizadoEm: now,
    };
    await this.users.save(user);
    return toUserView(user);
  }
}
