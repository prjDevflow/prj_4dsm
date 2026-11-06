import type { NfcTag } from '../../entities/NfcTag';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type {
  INfcTagRepository,
  NfcTagDetails,
  NfcTagListFilter,
  NfcTagListResult,
} from '../../repositories/INfcTagRepository';
import { ConflictError } from '../../shared/errors/AppError';

// Only what the read model exposes, so nothing else of the user (the password hash) is even loaded.
const withUser = { usuario: { select: { id: true, nome: true } } } as const;

type NfcTagRow = Prisma.NfcTagGetPayload<object>;
type NfcTagRowWithUser = Prisma.NfcTagGetPayload<{ include: typeof withUser }>;

const toEntity = (row: NfcTagRow): NfcTag => ({
  id: row.id,
  usuarioId: row.usuarioId,
  uid: row.uid,
  descricao: row.descricao,
  ativa: row.ativa,
  criadaEm: row.criadaEm,
});

const toDetails = (row: NfcTagRowWithUser): NfcTagDetails => ({
  tag: toEntity(row),
  usuario: row.usuario,
});

// P2002 is Prisma's unique-constraint violation; `uid` is the only unique column besides the id.
const isUidTaken = (error: unknown) =>
  (error as { code?: string } | null)?.code === 'P2002' &&
  JSON.stringify((error as { meta?: unknown }).meta ?? '').includes('uid');

// P2025 is Prisma's "record to update not found".
const isRecordNotFound = (error: unknown) => (error as { code?: string } | null)?.code === 'P2025';

export class PrismaNfcTagRepository implements INfcTagRepository {
  constructor(private prisma: PrismaClient) {}

  async save(tag: NfcTag) {
    try {
      await this.prisma.nfcTag.create({ data: tag });
    } catch (error) {
      // Two requests can pass `findByUid` together; the unique index decides who wins.
      if (isUidTaken(error)) {
        throw new ConflictError('TAG_JA_CADASTRADA', 'Esta tag já está vinculada a alguém');
      }
      throw error;
    }
  }

  async findByUid(uid: string) {
    const row = await this.prisma.nfcTag.findUnique({ where: { uid } });
    return row ? toEntity(row) : null;
  }

  async list(filter: NfcTagListFilter): Promise<NfcTagListResult> {
    const where: Prisma.NfcTagWhereInput = {
      ...(filter.usuarioId !== undefined && { usuarioId: filter.usuarioId }),
      ...(filter.ativa !== undefined && { ativa: filter.ativa }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.nfcTag.findMany({
        where,
        include: withUser,
        // `id` breaks ties, so a page never repeats or skips a tag.
        orderBy: [{ criadaEm: 'desc' }, { id: 'asc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.nfcTag.count({ where }),
    ]);
    return { items: rows.map(toDetails), total };
  }

  async update(id: string, changes: { ativa: boolean }) {
    try {
      const row = await this.prisma.nfcTag.update({
        where: { id },
        data: { ativa: changes.ativa },
        include: withUser,
      });
      return toDetails(row);
    } catch (error) {
      if (isRecordNotFound(error)) return null;
      throw error;
    }
  }
}
