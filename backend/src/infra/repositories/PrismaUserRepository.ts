import type { User } from '../../entities/User';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { ConflictError } from '../../shared/errors/AppError';
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

// `contains` passes the text to LIKE as is, so `%` and `_` would act as wildcards.
const escapeLike = (text: string) => text.replace(/[\\%_]/g, '\\$&');

// P2002 is Prisma's unique-constraint violation. The only unique column besides the id is the e-mail.
const isEmailTaken = (error: unknown) =>
  (error as { code?: string } | null)?.code === 'P2002' &&
  JSON.stringify((error as { meta?: unknown }).meta ?? '').includes('email');

export class PrismaUserRepository implements IUserRepository {
  // A transaction client too: inside a unit of work the same code runs on the transaction.
  constructor(private prisma: Prisma.TransactionClient) {}

  async findById(id: string) {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }

  async findByIdForShare(_id: string): Promise<User | null> {
    throw new Error('B08: ainda não implementado');
  }

  async findByEmail(email: string) {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? toEntity(row) : null;
  }

  async existsByEmail(email: string) {
    return (await this.prisma.user.count({ where: { email } })) > 0;
  }

  async save(user: User) {
    const data = {
      nome: user.nome,
      email: user.email,
      senhaHash: user.senhaHash,
      perfil: user.perfil,
      ativo: user.ativo,
      criadoEm: user.criadoEm,
      atualizadoEm: user.atualizadoEm,
    };
    try {
      await this.prisma.user.upsert({
        where: { id: user.id },
        create: { id: user.id, ...data },
        update: data,
      });
    } catch (error) {
      // Two requests can pass `existsByEmail` together; the unique index decides who wins.
      if (isEmailTaken(error)) {
        throw new ConflictError('EMAIL_JA_CADASTRADO', 'Já existe um usuário com este e-mail');
      }
      throw error;
    }
  }

  async list(filter: UserListFilter): Promise<UserListResult> {
    const where: Prisma.UserWhereInput = {
      ...(filter.perfil !== undefined && { perfil: filter.perfil }),
      ...(filter.ativo !== undefined && { ativo: filter.ativo }),
      ...(filter.q && {
        OR: [
          { nome: { contains: escapeLike(filter.q), mode: 'insensitive' } },
          { email: { contains: escapeLike(filter.q), mode: 'insensitive' } },
        ],
      }),
    };
    const rows = await this.prisma.user.findMany({
      where,
      // `id` breaks ties, so a page never repeats or skips a user.
      orderBy: [{ nome: 'asc' }, { id: 'asc' }],
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    });
    // Two queries, not `$transaction([...])`: a transaction client has no `$transaction`.
    const total = await this.prisma.user.count({ where });
    return { items: rows.map(toEntity), total };
  }

  async countActiveAdmins() {
    return this.prisma.user.count({ where: { perfil: 'ADMIN', ativo: true } });
  }
}
