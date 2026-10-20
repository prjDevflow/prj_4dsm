import type { UserProfile } from '../../../entities/User';
import type { IUserRepository } from '../../../repositories/IUserRepository';
import { InvalidSessionError } from '../authErrors';

export interface CurrentUser {
  id: string;
  nome: string;
  email: string;
  perfil: UserProfile;
}

export class GetCurrentUserUseCase {
  constructor(private users: IUserRepository) {}

  async execute(userId: string): Promise<CurrentUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new InvalidSessionError();

    return { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil };
  }
}
