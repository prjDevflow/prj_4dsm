import type { IClock } from '../../../providers/IClock';
import type { IHashProvider } from '../../../providers/IHashProvider';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { IUserRepository } from '../../../repositories/IUserRepository';
import type { UserView } from '../userView';
import type { ICreateUserDTO } from './CreateUser_DTO';

export class CreateUserUseCase {
  constructor(
    private users: IUserRepository,
    private hash: IHashProvider,
    private ids: IIdGenerator,
    private clock: IClock,
  ) {}

  async execute(_input: ICreateUserDTO): Promise<UserView> {
    throw new Error('not implemented');
  }
}
