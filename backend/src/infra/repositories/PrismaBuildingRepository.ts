import type { Building } from '../../entities/Building';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type {
  BuildingListFilter,
  BuildingListResult,
  IBuildingRepository,
} from '../../repositories/IBuildingRepository';

type BuildingRow = Awaited<ReturnType<PrismaClient['building']['findUniqueOrThrow']>>;

const toEntity = (row: BuildingRow): Building => ({
  id: row.id,
  nome: row.nome,
  endereco: row.endereco,
  latitude: row.latitude,
  longitude: row.longitude,
  ativo: row.ativo,
});

const toData = (building: Building) => ({
  nome: building.nome,
  endereco: building.endereco,
  latitude: building.latitude,
  longitude: building.longitude,
  ativo: building.ativo,
});

export class PrismaBuildingRepository implements IBuildingRepository {
  // A transaction client too: inside a unit of work the same code runs on the transaction.
  constructor(private prisma: Prisma.TransactionClient) {}

  async findById(id: string) {
    const row = await this.prisma.building.findUnique({ where: { id } });
    return row ? toEntity(row) : null;
  }

  async save(building: Building) {
    await this.prisma.building.upsert({
      where: { id: building.id },
      create: { id: building.id, ...toData(building) },
      update: toData(building),
    });
  }

  async findByIdForUpdate(id: string) {
    // Only meaningful inside a transaction: the lock lasts until it ends.
    await this.prisma.$queryRaw`SELECT id FROM buildings WHERE id = ${id}::uuid FOR UPDATE`;
    return this.findById(id);
  }

  async findByIdForShare(id: string) {
    await this.prisma.$queryRaw`SELECT id FROM buildings WHERE id = ${id}::uuid FOR SHARE`;
    return this.findById(id);
  }

  async list(filter: BuildingListFilter): Promise<BuildingListResult> {
    const where = filter.ativo === undefined ? {} : { ativo: filter.ativo };
    const rows = await this.prisma.building.findMany({
      where,
      // `id` breaks ties, so a page never repeats or skips a building.
      orderBy: [{ nome: 'asc' }, { id: 'asc' }],
      skip: (filter.page - 1) * filter.pageSize,
      take: filter.pageSize,
    });
    const total = await this.prisma.building.count({ where });
    return { items: rows.map(toEntity), total };
  }
}
