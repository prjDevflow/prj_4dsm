import type { IClock } from '../../../providers/IClock';
import type { ITerminalCommandRepository } from '../../../repositories/ITerminalCommandRepository';

export class AckCommandUseCase {
  constructor(
    private commands: ITerminalCommandRepository,
    private clock: IClock,
  ) {}

  async execute(terminalId: string, commandId: number): Promise<void> {
    void [terminalId, commandId, this.commands, this.clock];
  }
}
