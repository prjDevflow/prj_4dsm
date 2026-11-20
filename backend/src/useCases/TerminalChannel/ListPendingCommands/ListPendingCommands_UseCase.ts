import type { TerminalCommand } from '../../../entities/TerminalCommand';
import type { IClock } from '../../../providers/IClock';
import type { ITerminalCommandRepository } from '../../../repositories/ITerminalCommandRepository';

export interface ListPendingCommandsInput {
  /** Only commands with a greater `id` come back. */
  after: number;
  limit: number;
}

export class ListPendingCommandsUseCase {
  constructor(
    private commands: ITerminalCommandRepository,
    private clock: IClock,
  ) {}

  async execute(terminalId: string, input: ListPendingCommandsInput): Promise<TerminalCommand[]> {
    const now = this.clock.now();
    const pending = await this.commands.listPending(terminalId, input.after, input.limit, now);
    // Only what is being handed over counts as delivered; the port keeps the first delivery time.
    if (pending.length > 0) {
      await this.commands.markDelivered(
        pending.map((command) => command.id),
        now,
      );
    }
    return pending;
  }
}
