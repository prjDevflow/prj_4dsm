import type { IClock } from '../../../providers/IClock';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import { NotFoundError } from '../../../shared/errors/AppError';
import { toTerminalView, type TerminalView, type TerminalViewConfig } from '../terminalView';
import type { IUpdateTerminalDTO } from './UpdateTerminal_DTO';

export class UpdateTerminalUseCase {
  constructor(
    private terminals: ITerminalRepository,
    private clock: IClock,
    private config: TerminalViewConfig,
  ) {}

  async execute(id: string, input: IUpdateTerminalDTO): Promise<TerminalView> {
    const terminal = await this.terminals.findById(id);
    if (!terminal) throw new NotFoundError('Terminal não encontrado');

    const updated = {
      ...terminal,
      nome: input.nome ?? terminal.nome,
      ativo: input.ativo ?? terminal.ativo,
    };
    await this.terminals.save(updated);
    return toTerminalView(updated, this.clock.now(), this.config);
  }
}
