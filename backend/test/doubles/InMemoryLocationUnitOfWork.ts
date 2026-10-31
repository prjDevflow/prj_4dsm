import type {
  ILocationUnitOfWork,
  LocationRepositories,
} from '../../src/repositories/ILocationUnitOfWork';
import { InMemoryAccessPointRepository } from './InMemoryAccessPointRepository';
import { InMemoryAuthorizationRepository } from './InMemoryAuthorizationRepository';
import { InMemoryBuildingRepository } from './InMemoryBuildingRepository';

/** Runs the work right away on the same fakes. Rollback and real locking are proven in the integration tests. */
export class InMemoryLocationUnitOfWork implements ILocationUnitOfWork {
  constructor(private repositories: LocationRepositories) {}

  run<T>(work: (repositories: LocationRepositories) => Promise<T>) {
    return work(this.repositories);
  }
}

/** The location fakes wired together, plus `locks`: the row locks taken so far, in order. */
export function makeLocationDoubles() {
  const locks: string[] = [];
  const accessPoints = new InMemoryAccessPointRepository(locks);
  const buildings = new InMemoryBuildingRepository(locks);
  const authorizations = new InMemoryAuthorizationRepository(accessPoints);
  const uow = new InMemoryLocationUnitOfWork({ buildings, accessPoints, authorizations });
  return { uow, buildings, accessPoints, authorizations, locks };
}
