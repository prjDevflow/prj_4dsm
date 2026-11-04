import type { IClock } from '../../../providers/IClock';
import type { ITerminalCommandRepository } from '../../../repositories/ITerminalCommandRepository';

export interface PurgeExpiredCommandsConfig {
  /** `COMMAND_PURGE_AFTER_HOURS`. */
  purgeAfterHours: number;
}

export class PurgeExpiredCommandsUseCase {
  constructor(
    private commands: ITerminalCommandRepository,
    private clock: IClock,
    private config: PurgeExpiredCommandsConfig,
  ) {}

  /** Returns how many commands were deleted. */
  async execute(): Promise<number> {
    void [this.commands, this.clock, this.config];
    return 0;
  }
}
