import type { AccessPoint, AccessPointType } from '../entities/AccessPoint';

export interface AccessPointListFilter {
  buildingId?: string;
  tipo?: AccessPointType;
  ativo?: boolean;
  /** 1-based. */
  page: number;
  pageSize: number;
}

export interface AccessPointListResult {
  items: AccessPoint[];
  /** Matches before pagination. */
  total: number;
}

export interface IAccessPointRepository {
  findById(id: string): Promise<AccessPoint | null>;
  /** The `identificacao` is unique inside a building. `exceptId` leaves the point being edited out. */
  existsByIdentificacao(
    buildingId: string,
    identificacao: string,
    exceptId?: string,
  ): Promise<boolean>;
  /** Inserts a new access point or updates the one with the same id. A repeated `identificacao` in the building throws a 409 `CONFLICT`. */
  save(accessPoint: AccessPoint): Promise<void>;
  /** Ordered by name. */
  list(filter: AccessPointListFilter): Promise<AccessPointListResult>;
}
