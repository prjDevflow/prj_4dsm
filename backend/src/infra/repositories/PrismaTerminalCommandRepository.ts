import type { NewTerminalCommand, TerminalCommand } from '../../entities/TerminalCommand';
import type { Prisma } from '../../generated/prisma/client';
import type { ITerminalCommandRepository } from '../../repositories/ITerminalCommandRepository';

export class PrismaTerminalCommandRepository implements ITerminalCommandRepository {
  // A transaction client too: the approval (B15) creates the command inside its own transaction.
  constructor(private prisma: Prisma.TransactionClient) {}

  async create(command: NewTerminalCommand): Promise<TerminalCommand> {
    void [command, this.prisma];
    throw new Error('não implementado');
  }

  async listPending(
    terminalId: string,
    after: number,
    limit: number,
    now: Date,
  ): Promise<TerminalCommand[]> {
    void [terminalId, after, limit, now];
    throw new Error('não implementado');
  }

  async markDelivered(ids: number[], at: Date): Promise<void> {
    void [ids, at];
    throw new Error('não implementado');
  }

  async markExecuted(terminalId: string, id: number, at: Date): Promise<boolean> {
    void [terminalId, id, at];
    throw new Error('não implementado');
  }
}
