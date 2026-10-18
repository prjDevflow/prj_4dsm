import type { IClock } from '../../../providers/IClock';
import type { IDatabaseProbe } from '../../../providers/IDatabaseProbe';
import type { IGetHealthResponseDTO } from './GetHealth_DTO';

export class GetHealthUseCase {
  constructor(
    private clock: IClock,
    private database: IDatabaseProbe,
    private config: { version: string },
  ) {}

  async execute(): Promise<IGetHealthResponseDTO> {
    return {
      status: 'ok',
      version: this.config.version,
      time: this.clock.now().toISOString(),
      db: (await this.isDatabaseUp()) ? 'up' : 'down',
    };
  }

  // A broken database must not break the health endpoint: it reports "down" instead.
  private async isDatabaseUp(): Promise<boolean> {
    try {
      return await this.database.ping();
    } catch {
      return false;
    }
  }
}
