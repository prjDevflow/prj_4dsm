import type { IClock } from '../../../providers/IClock';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import type { Page } from '../../../shared/pagination';
import type { TerminalView, TerminalViewConfig } from '../terminalView';
import type { IListTerminalsDTO } from './ListTerminals_DTO';

export class ListTerminalsUseCase {
  constructor(
    private terminals: ITerminalRepository,
    private clock: IClock,
    private config: TerminalViewConfig,
  ) {}

  async execute(_input: IListTerminalsDTO): Promise<Page<TerminalView>> {
    throw new Error('not implemented');
  }
}
