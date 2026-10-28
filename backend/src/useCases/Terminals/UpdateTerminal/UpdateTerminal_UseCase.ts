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
    // Only these two columns are written, so a key rotated or a contact stored meanwhile is never undone.
    const updated = await this.terminals.updateDetails(id, {
      nome: input.nome,
      ativo: input.ativo,
    });
    if (!updated) throw new NotFoundError('Terminal não encontrado');
    return toTerminalView(updated, this.clock.now(), this.config);
  }
}
