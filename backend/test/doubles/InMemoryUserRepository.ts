import type { User } from '../../src/entities/User';
import type { IUserRepository, UserListFilter } from '../../src/repositories/IUserRepository';

export class InMemoryUserRepository implements IUserRepository {
  private items = new Map<string, User>();

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

  async existsByEmail(email: string) {
    return [...this.items.values()].some((item) => item.email === email);
  }

  async list(filter: UserListFilter) {
    const q = filter.q?.toLowerCase();
    const matches = [...this.items.values()]
      .filter((u) => filter.perfil === undefined || u.perfil === filter.perfil)
      .filter((u) => filter.ativo === undefined || u.ativo === filter.ativo)
      .filter((u) => !q || u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome) || a.id.localeCompare(b.id));
    const start = (filter.page - 1) * filter.pageSize;
    return {
      items: matches.slice(start, start + filter.pageSize).map((u) => ({ ...u })),
      total: matches.length,
    };
  }

  async countActiveAdmins() {
    return [...this.items.values()].filter((u) => u.perfil === 'ADMIN' && u.ativo).length;
  }
}
