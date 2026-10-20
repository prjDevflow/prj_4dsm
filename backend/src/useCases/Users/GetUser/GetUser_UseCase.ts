import type { IUserRepository } from '../../../repositories/IUserRepository';
import { NotFoundError } from '../../../shared/errors/AppError';
import { toUserView, type UserView } from '../userView';

export class GetUserUseCase {
  constructor(private users: IUserRepository) {}

  async execute(id: string): Promise<UserView> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError('Usuário não encontrado');
    return toUserView(user);
  }
}
