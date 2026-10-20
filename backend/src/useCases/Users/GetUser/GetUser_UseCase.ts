import type { IUserRepository } from '../../../repositories/IUserRepository';
import type { UserView } from '../userView';

export class GetUserUseCase {
  constructor(private users: IUserRepository) {}

  async execute(_id: string): Promise<UserView> {
    throw new Error('not implemented');
  }
}
