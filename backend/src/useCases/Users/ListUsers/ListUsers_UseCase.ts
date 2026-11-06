import type { IUserRepository } from '../../../repositories/IUserRepository';
import type { Page } from '../../../shared/pagination';
import { toUserView, type UserView } from '../userView';
import type { IListUsersDTO } from './ListUsers_DTO';

export class ListUsersUseCase {
  constructor(private users: IUserRepository) {}

  async execute(input: IListUsersDTO): Promise<Page<UserView>> {
    const { items, total } = await this.users.list(input);
    return {
      data: items.map(toUserView),
      page: input.page,
      pageSize: input.pageSize,
      total,
    };
  }
}
