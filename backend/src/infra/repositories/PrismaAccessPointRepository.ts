import type { AccessPoint } from '../../entities/AccessPoint';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type {
  AccessPointListFilter,
  AccessPointListResult,
  IAccessPointRepository,
} from '../../repositories/IAccessPointRepository';
import { ConflictError } from '../../shared/errors/AppError';

type AccessPointRow = Awaited<ReturnType<PrismaClient['accessPoint']['findUniqueOrThrow']>>;

const toEntity = (row: AccessPointRow): AccessPoint => ({
  id: row.id,
  buildingId: row.buildingId,
  tipo: row.tipo,
  nome: row.nome,
  identificacao: row.identificacao,
  latitude: row.latitude,
  longitude: row.longitude,
  ativo: row.ativo,
});

// P2002 is Prisma's unique-constraint violation; (buildingId, identificacao) is the only unique key besides the id.
const isIdentificationTaken = (error: unknown) =>
  (error as { code?: string } | null)?.code === 'P2002' &&
  JSON.stringify((error as { meta?: unknown }).meta ?? '').includes('identificacao');

export class PrismaAccessPointRepository implements IAccessPointRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string) {
    const row = await this.prisma.accessPoint.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }

  async existsByIdentificacao(buildingId: string, identificacao: string, exceptId?: string) {
    const count = await this.prisma.accessPoint.count({
      where: {
        buildingId,
        identificacao,
        ...(exceptId !== undefined && { id: { not: exceptId } }),
      },
    });
    return count > 0;
  }

  async save(point: AccessPoint) {
    const data = {
      buildingId: point.buildingId,
      tipo: point.tipo,
      nome: point.nome,
      identificacao: point.identificacao,
      latitude: point.latitude,
      longitude: point.longitude,
      ativo: point.ativo,
    };
    try {
      await this.prisma.accessPoint.upsert({
        where: { id: point.id },
        create: { id: point.id, ...data },
        update: data,
      });
    } catch (error) {
      // The unique index decides when two requests use the same identification at once.
      if (isIdentificationTaken(error)) {
        throw new ConflictError(
          'CONFLICT',
          'Já existe um ponto de acesso com esta identificação no edifício',
        );
      }
      throw error;
    }
  }

  async list(filter: AccessPointListFilter): Promise<AccessPointListResult> {
    const where: Prisma.AccessPointWhereInput = {
      ...(filter.buildingId !== undefined && { buildingId: filter.buildingId }),
      ...(filter.tipo !== undefined && { tipo: filter.tipo }),
      ...(filter.ativo !== undefined && { ativo: filter.ativo }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.accessPoint.findMany({
        where,
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.accessPoint.count({ where }),
    ]);
    return { items: rows.map(toEntity), total };
  }
}
