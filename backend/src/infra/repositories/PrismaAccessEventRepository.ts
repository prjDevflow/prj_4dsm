import type { AccessEvent } from '../../entities/AccessEvent';
import type { Prisma } from '../../generated/prisma/client';
import type { IAccessEventRepository } from '../../repositories/IAccessEventRepository';

export class PrismaAccessEventRepository implements IAccessEventRepository {
  // A transaction client too: the approval (B15) writes the event inside its own transaction.
  constructor(private prisma: Prisma.TransactionClient) {}

  async append(_event: AccessEvent): Promise<void> {
    throw new Error('não implementado');
  }
}
