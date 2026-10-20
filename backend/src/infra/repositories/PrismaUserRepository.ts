import type { User } from '../../entities/User';
import type { PrismaClient } from '../../generated/prisma/client';
import type {
  IUserRepository,
  UserListFilter,
  UserListResult,
} from '../../repositories/IUserRepository';

type UserRow = Awaited<ReturnType<PrismaClient['user']['findUniqueOrThrow']>>;

// Explicit mapping, so a column added later never reaches the entity by accident.
const toEntity = (row: UserRow): User => ({
  id: row.id,
  nome: row.nome,
  email: row.email,
  senhaHash: row.senhaHash,
  perfil: row.perfil,
  ativo: row.ativo,
  criadoEm: row.criadoEm,
  atualizadoEm: row.atualizadoEm,
});

export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string) {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }

  async findByEmail(email: string) {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? toEntity(row) : null;
  }

  // Placeholders until the repository integration tests of B06 drive the real queries.
  async existsByEmail(_email: string): Promise<boolean> {
    throw new Error('not implemented');
  }

  async save(_user: User): Promise<void> {
    throw new Error('not implemented');
  }

  async list(_filter: UserListFilter): Promise<UserListResult> {
    throw new Error('not implemented');
  }

  async countActiveAdmins(): Promise<number> {
    throw new Error('not implemented');
  }
}
