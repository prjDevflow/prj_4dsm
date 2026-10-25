import type { Building } from '../../entities/Building';
import type { PrismaClient } from '../../generated/prisma/client';
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
  constructor(private prisma: PrismaClient) {}

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

  async saveAndDeactivateAccessPoints(building: Building) {
    // One transaction: the points are switched off first, so a failure saving the building undoes them.
    await this.prisma.$transaction([
      this.prisma.accessPoint.updateMany({
        where: { buildingId: building.id },
        data: { ativo: false },
      }),
      this.prisma.building.upsert({
        where: { id: building.id },
        create: { id: building.id, ...toData(building) },
        update: toData(building),
      }),
    ]);
  }

  async list(filter: BuildingListFilter): Promise<BuildingListResult> {
    const where = filter.ativo === undefined ? {} : { ativo: filter.ativo };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.building.findMany({
        where,
        // `id` breaks ties, so a page never repeats or skips a building.
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      this.prisma.building.count({ where }),
    ]);
    return { items: rows.map(toEntity), total };
  }
}
