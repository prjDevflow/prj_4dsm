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
  /**
   * Same as `findById`, but inside a unit of work it locks the row (`FOR UPDATE`) until the transaction ends.
   * The id must already be validated (a malformed id would make the database fail instead of returning null).
   */
  findByIdForUpdate(id: string): Promise<AccessPoint | null>;
  /**
   * Same as `findById`, but locks the row against deactivation (`FOR SHARE`) while still letting other
   * readers in. Used before putting an authorization on the point.
   * The id must already be validated.
   */
  findByIdForShare(id: string): Promise<AccessPoint | null>;
  /** Locks every access point of the building (`FOR UPDATE`) until the transaction ends. Ids must already be validated. */
  lockByBuilding(buildingId: string): Promise<void>;
  /** Sets `ativo = false` on every access point of the building. */
  deactivateByBuilding(buildingId: string): Promise<void>;
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
