import type { Building } from '../entities/Building';

export interface BuildingListFilter {
  ativo?: boolean;
  /** 1-based. */
  page: number;
  pageSize: number;
}

export interface BuildingListResult {
  items: Building[];
  /** Matches before pagination. */
  total: number;
}

export interface IBuildingRepository {
  findById(id: string): Promise<Building | null>;
  /** Inserts a new building or updates the one with the same id. */
  save(building: Building): Promise<void>;
  /**
   * Same as `findById`, but inside a unit of work it locks the row (`FOR UPDATE`) until the transaction
   * ends: nobody else changes, deactivates or adds a point to the building meanwhile.
   * The id must already be validated (a malformed id would make the database fail instead of returning null).
   */
  findByIdForUpdate(id: string): Promise<Building | null>;
  /**
   * Same as `findById`, but locks the row against deactivation (`FOR SHARE`) while still letting other
   * readers in. Used before putting a point inside the building.
   */
  findByIdForShare(id: string): Promise<Building | null>;
  /** Ordered by name. */
  list(filter: BuildingListFilter): Promise<BuildingListResult>;
}
