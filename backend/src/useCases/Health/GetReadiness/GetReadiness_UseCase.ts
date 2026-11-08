import type { IClock } from '../../../providers/IClock';
import type { IDatabaseProbe } from '../../../providers/IDatabaseProbe';
import type { IGetReadinessResponseDTO } from './GetReadiness_DTO';

export class GetReadinessUseCase {
  constructor(
    private clock: IClock,
    private database: IDatabaseProbe,
  ) {}

  async execute(): Promise<IGetReadinessResponseDTO> {
    const up = await this.isDatabaseUp();
    return {
      status: up ? 'ready' : 'unavailable',
      db: up ? 'up' : 'down',
      time: this.clock.now().toISOString(),
    };
  }

  // A broken database is the answer ("not ready"), not an error of this endpoint.
  private async isDatabaseUp(): Promise<boolean> {
    try {
      return await this.database.ping();
    } catch {
      return false;
    }
  }
}
