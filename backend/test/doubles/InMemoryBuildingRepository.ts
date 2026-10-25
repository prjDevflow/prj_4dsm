import type { Building } from '../../src/entities/Building';
import type {
  BuildingListFilter,
  IBuildingRepository,
} from '../../src/repositories/IBuildingRepository';
import type { InMemoryAccessPointRepository } from './InMemoryAccessPointRepository';

export class InMemoryBuildingRepository implements IBuildingRepository {
  private items = new Map<string, Building>();

  constructor(private accessPoints: InMemoryAccessPointRepository) {}

  async findById(id: string) {
    const building = this.items.get(id);
    return building ? { ...building } : null;
  }

  async save(building: Building) {
    this.items.set(building.id, { ...building });
  }

  async saveAndDeactivateAccessPoints(building: Building) {
    this.items.set(building.id, { ...building });
    this.accessPoints.deactivateByBuilding(building.id);
  }

  async list(filter: BuildingListFilter) {
    const matches = [...this.items.values()]
      .filter((b) => filter.ativo === undefined || b.ativo === filter.ativo)
      .sort((a, b) => a.nome.localeCompare(b.nome) || a.id.localeCompare(b.id));
    const start = (filter.page - 1) * filter.pageSize;
    return {
      items: matches.slice(start, start + filter.pageSize).map((b) => ({ ...b })),
      total: matches.length,
    };
  }
}
