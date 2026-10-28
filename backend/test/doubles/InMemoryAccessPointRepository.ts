import type { AccessPoint } from '../../src/entities/AccessPoint';
import type {
  AccessPointListFilter,
  IAccessPointRepository,
} from '../../src/repositories/IAccessPointRepository';
import { ConflictError } from '../../src/shared/errors/AppError';

export class InMemoryAccessPointRepository implements IAccessPointRepository {
  private items = new Map<string, AccessPoint>();

  /** `locks` is shared with the other fakes of a unit of work, so a test sees the order of the locks. */
  constructor(private locks: string[] = []) {}

  async findById(id: string) {
    const point = this.items.get(id);
    return point ? { ...point } : null;
  }

  async findByIdForUpdate(id: string) {
    this.locks.push(`point:update:${id}`);
    return this.findById(id);
  }

  async lockByBuilding(buildingId: string) {
    this.locks.push(`points:building:${buildingId}`);
  }

  async existsByIdentificacao(buildingId: string, identificacao: string, exceptId?: string) {
    return [...this.items.values()].some(
      (item) =>
        item.buildingId === buildingId &&
        item.identificacao === identificacao &&
        item.id !== exceptId,
    );
  }

  async save(point: AccessPoint) {
    // Same promise as the unique index (buildingId, identificacao).
    if (await this.existsByIdentificacao(point.buildingId, point.identificacao, point.id)) {
      throw new ConflictError(
        'CONFLICT',
        'Já existe um ponto de acesso com esta identificação no edifício',
      );
    }
    this.items.set(point.id, { ...point });
  }

  async list(filter: AccessPointListFilter) {
    const matches = [...this.items.values()]
      .filter((p) => filter.buildingId === undefined || p.buildingId === filter.buildingId)
      .filter((p) => filter.tipo === undefined || p.tipo === filter.tipo)
      .filter((p) => filter.ativo === undefined || p.ativo === filter.ativo)
      .sort((a, b) => a.nome.localeCompare(b.nome) || a.id.localeCompare(b.id));
    const start = (filter.page - 1) * filter.pageSize;
    return {
      items: matches.slice(start, start + filter.pageSize).map((p) => ({ ...p })),
      total: matches.length,
    };
  }

  async deactivateByBuilding(buildingId: string) {
    for (const [id, point] of this.items) {
      if (point.buildingId === buildingId) this.items.set(id, { ...point, ativo: false });
    }
  }

  /** Not part of the port: lets a test see every stored point. */
  all() {
    return [...this.items.values()].map((p) => ({ ...p }));
  }
}
