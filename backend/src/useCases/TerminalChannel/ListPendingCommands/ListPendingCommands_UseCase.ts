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
    void [terminalId, input, this.commands, this.clock];
    return [];
  }
}
