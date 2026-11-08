import type { IClock } from '../../../providers/IClock';
import type { IDatabaseProbe } from '../../../providers/IDatabaseProbe';
import type { IGetReadinessResponseDTO } from './GetReadiness_DTO';

export class GetReadinessUseCase {
  constructor(
    private clock: IClock,
    private database: IDatabaseProbe,
  ) {}

  async execute(): Promise<IGetReadinessResponseDTO> {
    const up = await this.database.ping();
    return {
      status: up ? 'ready' : 'unavailable',
      db: up ? 'up' : 'down',
      time: this.clock.now().toISOString(),
    };
  }
}
