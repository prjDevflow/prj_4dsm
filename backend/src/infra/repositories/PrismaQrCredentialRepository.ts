import type { QrCredential } from '../../entities/QrCredential';
import type { PrismaClient } from '../../generated/prisma/client';
import type { IQrCredentialRepository } from '../../repositories/IQrCredentialRepository';

type QrCredentialRow = Awaited<ReturnType<PrismaClient['qrCredential']['findUniqueOrThrow']>>;

const toEntity = (row: QrCredentialRow): QrCredential => ({
  id: row.id,
  terminalId: row.terminalId,
  tokenHash: row.tokenHash,
  emitidoEm: row.emitidoEm,
  expiraEm: row.expiraEm,
  consumidoEm: row.consumidoEm,
  consumidoPorId: row.consumidoPorId,
});

export class PrismaQrCredentialRepository implements IQrCredentialRepository {
  constructor(private prisma: PrismaClient) {}

  async saveIfIdle(credential: QrCredential, previousIssueUntil: Date) {
    return this.prisma.$transaction(async (tx) => {
      // The check and the insert are two statements, so requests for the same terminal take turns: the
      // lock lasts until the transaction ends, and the next one then sees the row just written (each
      // statement of a READ COMMITTED transaction reads the data committed up to that moment). The lock
      // is per terminal; other terminals do not wait. `$executeRaw` because the function returns void.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${credential.terminalId}::text, 0))`;
      const tooSoon = await tx.qrCredential.findFirst({
        where: { terminalId: credential.terminalId, emitidoEm: { gt: previousIssueUntil } },
        select: { id: true },
      });
      if (tooSoon) return false;
      await tx.qrCredential.create({ data: credential });
      return true;
    });
  }

  async findByTokenHash(tokenHash: string) {
    const row = await this.prisma.qrCredential.findUnique({ where: { tokenHash } });
    return row ? toEntity(row) : null;
  }

  async deleteExpiredBefore(cutoff: Date) {
    const { count } = await this.prisma.qrCredential.deleteMany({
      where: { expiraEm: { lt: cutoff } },
    });
    return count;
  }
}
