import type { User } from '../../entities/User';
import type { PrismaClient } from '../../generated/prisma/client';
import type { IUserRepository } from '../../repositories/IUserRepository';

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
}
