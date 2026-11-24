import type { NewTerminalCommand, TerminalCommand } from '../../entities/TerminalCommand';
import type { Prisma } from '../../generated/prisma/client';
import type { ITerminalCommandRepository } from '../../repositories/ITerminalCommandRepository';

type TerminalCommandRow = Awaited<
  ReturnType<Prisma.TransactionClient['terminalCommand']['findUniqueOrThrow']>
>;

const toEntity = (row: TerminalCommandRow): TerminalCommand => ({
  id: row.id,
  terminalId: row.terminalId,
  tipo: row.tipo,
  motivo: row.motivo,
  aberturaMs: row.aberturaMs,
  criadoEm: row.criadoEm,
  expiraEm: row.expiraEm,
  entregueEm: row.entregueEm,
  executadoEm: row.executadoEm,
});

export class PrismaTerminalCommandRepository implements ITerminalCommandRepository {
  // A transaction client too: the approval (B15) creates the command inside its own transaction.
  constructor(private prisma: Prisma.TransactionClient) {}

  async create(command: NewTerminalCommand): Promise<TerminalCommand> {
    return toEntity(await this.prisma.terminalCommand.create({ data: command }));
  }

  async listPending(terminalId: string, after: number, limit: number, now: Date) {
    const rows = await this.prisma.terminalCommand.findMany({
      // `gte`: a command whose `expiraEm` is exactly `now` is still valid.
      where: { terminalId, id: { gt: after }, expiraEm: { gte: now } },
      orderBy: { id: 'asc' },
      take: limit,
    });
    return rows.map(toEntity);
  }

  async markDelivered(ids: number[], at: Date) {
    if (ids.length === 0) return;
    // `entregueEm: null` keeps the first delivery time, also when two polls overlap.
    await this.prisma.terminalCommand.updateMany({
      where: { id: { in: ids }, entregueEm: null },
      data: { entregueEm: at },
    });
  }

  async markExecuted(terminalId: string, id: number, at: Date) {
    await this.prisma.terminalCommand.updateMany({
      where: { id, terminalId, executadoEm: null },
      data: { executadoEm: at },
    });
    // The update touches nothing both for a missing command and for one already acknowledged, so
    // existence is a separate question: repeating the ack is fine, a foreign or unknown command is not.
    const exists = await this.prisma.terminalCommand.count({ where: { id, terminalId } });
    return exists > 0;
  }

  async deleteExpiredBefore(cutoff: Date): Promise<number> {
    // `lt`: a command that expires exactly at the cutoff stays. The serial `id` is never reused.
    const { count } = await this.prisma.terminalCommand.deleteMany({
      where: { expiraEm: { lt: cutoff } },
    });
    return count;
  }
}
