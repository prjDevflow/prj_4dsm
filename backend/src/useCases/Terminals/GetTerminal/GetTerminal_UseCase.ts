import type { IClock } from '../../../providers/IClock';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import { NotFoundError } from '../../../shared/errors/AppError';
import { toTerminalView, type TerminalView, type TerminalViewConfig } from '../terminalView';

export class GetTerminalUseCase {
  constructor(
    private terminals: ITerminalRepository,
    private clock: IClock,
    private config: TerminalViewConfig,
  ) {}

  async execute(id: string): Promise<TerminalView> {
    const terminal = await this.terminals.findById(id);
    if (!terminal) throw new NotFoundError('Terminal não encontrado');
    return toTerminalView(terminal, this.clock.now(), this.config);
  }
}
