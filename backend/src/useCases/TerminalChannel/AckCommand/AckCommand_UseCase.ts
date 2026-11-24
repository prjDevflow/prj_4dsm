import type { IClock } from '../../../providers/IClock';
import type { ITerminalCommandRepository } from '../../../repositories/ITerminalCommandRepository';
import { NotFoundError } from '../../../shared/errors/AppError';

export class AckCommandUseCase {
  constructor(
    private commands: ITerminalCommandRepository,
    private clock: IClock,
  ) {}

  async execute(terminalId: string, commandId: number): Promise<void> {
    const found = await this.commands.markExecuted(terminalId, commandId, this.clock.now());
    // Another terminal's command looks the same as one that does not exist: nothing is revealed.
    if (!found) throw new NotFoundError('Comando não encontrado');
  }
}
