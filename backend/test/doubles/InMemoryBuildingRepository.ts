import type { Building } from '../../src/entities/Building';
import type {
  BuildingListFilter,
  IBuildingRepository,
} from '../../src/repositories/IBuildingRepository';

export class InMemoryBuildingRepository implements IBuildingRepository {
  private items = new Map<string, Building>();

  /** `locks` is shared with the other fakes of a unit of work, so a test sees the order of the locks. */
  constructor(private locks: string[] = []) {}

  async findById(id: string) {
    const building = this.items.get(id);
    return building ? { ...building } : null;
  }

  async findByIdForUpdate(id: string) {
    this.locks.push(`building:update:${id}`);
    return this.findById(id);
  }

  async findByIdForShare(id: string) {
    this.locks.push(`building:share:${id}`);
    return this.findById(id);
  }

  async save(building: Building) {
    this.items.set(building.id, { ...building });
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
