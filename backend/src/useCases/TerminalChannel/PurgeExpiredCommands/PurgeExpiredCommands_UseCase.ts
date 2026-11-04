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
    const cutoff = new Date(this.clock.now().getTime() - this.config.purgeAfterHours * 3_600_000);
    return this.commands.deleteExpiredBefore(cutoff);
  }
}
