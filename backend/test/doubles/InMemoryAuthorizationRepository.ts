import type { Authorization } from '../../src/entities/Authorization';
import type { IAuthorizationRepository } from '../../src/repositories/IAuthorizationRepository';
import type { InMemoryAccessPointRepository } from './InMemoryAccessPointRepository';

export class InMemoryAuthorizationRepository implements IAuthorizationRepository {
  private items: Authorization[] = [];

  constructor(private accessPoints: InMemoryAccessPointRepository) {}

  /** Not part of the port yet (B08 adds `save`): seeds the fake. */
  add(authorization: Authorization) {
    this.items.push({ ...authorization });
  }

  async hasActiveNonExpiredForAccessPoint(accessPointId: string, today: string) {
    return this.items.some(
      (a) => a.accessPointId === accessPointId && a.situacao === 'ATIVA' && a.dataFim >= today,
    );
  }

  async hasActiveNonExpiredForBuilding(buildingId: string, today: string) {
    const pointIds = new Set(
      this.accessPoints
        .all()
        .filter((p) => p.buildingId === buildingId)
        .map((p) => p.id),
    );
    return this.items.some(
      (a) => pointIds.has(a.accessPointId) && a.situacao === 'ATIVA' && a.dataFim >= today,
    );
  }
}
