import type { PrismaClient } from '../../generated/prisma/client';
import type {
  CommitApprovalInput,
  CommitApprovalResult,
  IAccessGrantRepository,
} from '../../repositories/IAccessGrantRepository';

export class PrismaAccessGrantRepository implements IAccessGrantRepository {
  constructor(private prisma: PrismaClient) {}

  async commitApproval(_input: CommitApprovalInput): Promise<CommitApprovalResult> {
    void this.prisma;
    throw new Error('não implementado');
  }
}
