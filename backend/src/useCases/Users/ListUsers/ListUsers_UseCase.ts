import type { IUserRepository } from '../../../repositories/IUserRepository';
import type { Page } from '../../../shared/pagination';
import type { UserView } from '../userView';
import type { IListUsersDTO } from './ListUsers_DTO';

export class ListUsersUseCase {
  constructor(private users: IUserRepository) {}

  async execute(_input: IListUsersDTO): Promise<Page<UserView>> {
    throw new Error('not implemented');
  }
}
