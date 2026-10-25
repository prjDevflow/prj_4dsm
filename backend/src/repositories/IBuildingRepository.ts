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
  /** Saves the (now inactive) building and deactivates all of its access points, all or nothing. */
  saveAndDeactivateAccessPoints(building: Building): Promise<void>;
  /** Ordered by name. */
  list(filter: BuildingListFilter): Promise<BuildingListResult>;
}
