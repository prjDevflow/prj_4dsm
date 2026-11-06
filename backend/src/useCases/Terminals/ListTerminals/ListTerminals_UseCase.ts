import type { IClock } from '../../../providers/IClock';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import type { Page } from '../../../shared/pagination';
import { toTerminalView, type TerminalView, type TerminalViewConfig } from '../terminalView';
import type { IListTerminalsDTO } from './ListTerminals_DTO';

export class ListTerminalsUseCase {
  constructor(
    private terminals: ITerminalRepository,
    private clock: IClock,
    private config: TerminalViewConfig,
  ) {}

  async execute(input: IListTerminalsDTO): Promise<Page<TerminalView>> {
    const { items, total } = await this.terminals.list(input);
    const now = this.clock.now();
    return {
      data: items.map((terminal) => toTerminalView(terminal, now, this.config)),
      page: input.page,
      pageSize: input.pageSize,
      total,
    };
  }
}
