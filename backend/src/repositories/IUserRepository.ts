import type { User } from '../entities/User';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  /** Expects the e-mail already in lower case, as the database stores it. */
  findByEmail(email: string): Promise<User | null>;
}
