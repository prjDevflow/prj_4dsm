import type { User } from '../../src/entities/User';
import type { IUserRepository } from '../../src/repositories/IUserRepository';

export class InMemoryUserRepository implements IUserRepository {
  private items = new Map<string, User>();

  /** Fake-only for now: the port gets `save` in B06. */
  async save(user: User) {
    this.items.set(user.id, { ...user });
  }

  async findById(id: string) {
    const user = this.items.get(id);
    return user ? { ...user } : null;
  }

  async findByEmail(email: string) {
    const user = [...this.items.values()].find((item) => item.email === email);
    return user ? { ...user } : null;
  }
}
