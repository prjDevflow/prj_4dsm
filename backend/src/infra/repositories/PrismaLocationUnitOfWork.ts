import type { PrismaClient } from '../../generated/prisma/client';
import type {
  ILocationUnitOfWork,
  LocationRepositories,
} from '../../repositories/ILocationUnitOfWork';
import { PrismaAccessPointRepository } from './PrismaAccessPointRepository';
import { PrismaAuthorizationRepository } from './PrismaAuthorizationRepository';
import { PrismaBuildingRepository } from './PrismaBuildingRepository';
import { PrismaUserRepository } from './PrismaUserRepository';

export class PrismaLocationUnitOfWork implements ILocationUnitOfWork {
  constructor(private prisma: PrismaClient) {}

  run<T>(work: (repositories: LocationRepositories) => Promise<T>): Promise<T> {
    // An error thrown by `work` (including the 409 and 422 of the business rules) rolls everything back.
    return this.prisma.$transaction((tx) =>
      work({
        buildings: new PrismaBuildingRepository(tx),
        accessPoints: new PrismaAccessPointRepository(tx),
        authorizations: new PrismaAuthorizationRepository(tx),
        users: new PrismaUserRepository(tx),
      }),
    );
  }
}
