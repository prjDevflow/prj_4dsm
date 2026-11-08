import type { NfcTag } from '../../entities/NfcTag';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type {
  INfcTagRepository,
  NfcTagListFilter,
  NfcTagListResult,
} from '../../repositories/INfcTagRepository';
import { ConflictError } from '../../shared/errors/AppError';

type NfcTagRow = Awaited<ReturnType<PrismaClient['nfcTag']['findUniqueOrThrow']>>;

// Explicit mapping, so a column added later never reaches the entity by accident.
const toEntity = (row: NfcTagRow): NfcTag => ({
  id: row.id,
  usuarioId: row.usuarioId,
  uid: row.uid,
  descricao: row.descricao,
  ativa: row.ativa,
  criadaEm: row.criadaEm,
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
      await this.prisma.nfcTag.create({
        data: {
          id: tag.id,
          usuarioId: tag.usuarioId,
          uid: tag.uid,
          descricao: tag.descricao,
          ativa: tag.ativa,
          criadaEm: tag.criadaEm,
        },
      });
    } catch (error) {
      // The unique index decides when two requests link the same tag at once.
      if (isUidTaken(error)) {
        throw new ConflictError('TAG_JA_CADASTRADA', 'Esta tag já está cadastrada');
      }
      throw error;
    }
  }

  async findByUid(): Promise<NfcTag | null> {
    throw new Error('B17: ainda não implementado');
  }

  async updateStatus(id: string, ativa: boolean) {
    try {
      return toEntity(await this.prisma.nfcTag.update({ where: { id }, data: { ativa } }));
    } catch (error) {
      if (isRecordNotFound(error)) return null;
      throw error;
    }
  }

  async list(filter: NfcTagListFilter): Promise<NfcTagListResult> {
    const where: Prisma.NfcTagWhereInput = {
      ...(filter.usuarioId !== undefined && { usuarioId: filter.usuarioId }),
      ...(filter.ativa !== undefined && { ativa: filter.ativa }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.nfcTag.findMany({
        where,
        // `id` breaks ties, so a page never repeats or skips a tag.
        orderBy: [{ criadaEm: 'desc' }, { id: 'desc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.nfcTag.count({ where }),
    ]);
    return { items: rows.map(toEntity), total };
  }
}
