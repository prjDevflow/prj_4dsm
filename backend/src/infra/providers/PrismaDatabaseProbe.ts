import type { PrismaClient } from '../../generated/prisma/client';
import type { IDatabaseProbe } from '../../providers/IDatabaseProbe';

export class PrismaDatabaseProbe implements IDatabaseProbe {
  constructor(private prisma: PrismaClient) {}

  async ping() {
    await this.prisma.$queryRaw`SELECT 1`;
    return true;
  }
}
