import type { IClock } from '../../../providers/IClock';
import type { IHashProvider } from '../../../providers/IHashProvider';
import type { IUserRepository } from '../../../repositories/IUserRepository';
import type { UserView } from '../userView';
import type { IUpdateUserDTO } from './UpdateUser_DTO';

export class UpdateUserUseCase {
  constructor(
    private users: IUserRepository,
    private hash: IHashProvider,
    private clock: IClock,
  ) {}

  async execute(_id: string, _input: IUpdateUserDTO, _actorId: string): Promise<UserView> {
    throw new Error('not implemented');
  }
}
