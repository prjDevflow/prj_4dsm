import type { IClock } from '../../../providers/IClock';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import type { TerminalView, TerminalViewConfig } from '../terminalView';

export class GetTerminalUseCase {
  constructor(
    private terminals: ITerminalRepository,
    private clock: IClock,
    private config: TerminalViewConfig,
  ) {}

  async execute(_id: string): Promise<TerminalView> {
    throw new Error('not implemented');
  }
}
