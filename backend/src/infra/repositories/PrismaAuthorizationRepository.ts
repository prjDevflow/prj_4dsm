import type { Prisma } from '../../generated/prisma/client';
import type { IAuthorizationRepository } from '../../repositories/IAuthorizationRepository';

export class PrismaAuthorizationRepository implements IAuthorizationRepository {
  // A transaction client too: inside a unit of work the same code runs on the transaction.
  constructor(private prisma: Prisma.TransactionClient) {}

  async hasActiveNonExpiredForAccessPoint(accessPointId: string, today: string) {
    return this.hasActiveNonExpired({ accessPointId }, today);
  }

  async hasActiveNonExpiredForBuilding(buildingId: string, today: string) {
    return this.hasActiveNonExpired({ accessPoint: { buildingId } }, today);
  }

  private async hasActiveNonExpired(
    place: { accessPointId: string } | { accessPoint: { buildingId: string } },
    today: string,
  ) {
    const found = await this.prisma.authorization.findFirst({
      where: {
        ...place,
        situacao: 'ATIVA',
        // `dataFim` is a calendar date: the last day still counts.
        dataFim: { gte: new Date(today) },
      },
      select: { id: true },
    });
    return found !== null;
  }
}
