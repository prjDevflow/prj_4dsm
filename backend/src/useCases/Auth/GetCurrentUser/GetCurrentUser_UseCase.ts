import type { UserProfile } from '../../../entities/User';
import type { IUserRepository } from '../../../repositories/IUserRepository';

export interface CurrentUser {
  id: string;
  nome: string;
  email: string;
  perfil: UserProfile;
}

export class GetCurrentUserUseCase {
  constructor(private users: IUserRepository) {}

  async execute(_userId: string): Promise<CurrentUser> {
    throw new Error('não implementado');
  }
}
