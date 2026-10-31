import type { IAccessPointRepository } from './IAccessPointRepository';
import type { IAuthorizationRepository } from './IAuthorizationRepository';
import type { IBuildingRepository } from './IBuildingRepository';

/** The repositories as seen inside one transaction. */
export interface LocationRepositories {
  buildings: IBuildingRepository;
  accessPoints: IAccessPointRepository;
  authorizations: IAuthorizationRepository;
}

/**
 * Runs `work` in one database transaction: all its writes happen together or not at all, and the row
 * locks taken through the repositories (`findByIdForUpdate`, `lockByBuilding`...) last until it ends.
 * That is what lets "check, then change" rules (no active authorization, building still active) hold
 * against requests running at the same time.
 *
 * Lock order, to avoid deadlocks: building first, then its access points.
 */
export interface ILocationUnitOfWork {
  run<T>(work: (repositories: LocationRepositories) => Promise<T>): Promise<T>;
}
