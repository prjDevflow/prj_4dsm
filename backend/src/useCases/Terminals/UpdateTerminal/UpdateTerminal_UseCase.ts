import type { IClock } from '../../../providers/IClock';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import type { TerminalView, TerminalViewConfig } from '../terminalView';
import type { IUpdateTerminalDTO } from './UpdateTerminal_DTO';

export class UpdateTerminalUseCase {
  constructor(
    private terminals: ITerminalRepository,
    private clock: IClock,
    private config: TerminalViewConfig,
  ) {}

  async execute(_id: string, _input: IUpdateTerminalDTO): Promise<TerminalView> {
    throw new Error('not implemented');
  }
}
