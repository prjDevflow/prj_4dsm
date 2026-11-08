import type { IClock } from '../../../providers/IClock';
import type { IDatabaseProbe } from '../../../providers/IDatabaseProbe';
import type { IGetReadinessResponseDTO } from './GetReadiness_DTO';

export class GetReadinessUseCase {
  constructor(
    private clock: IClock,
    private database: IDatabaseProbe,
  ) {}

  async execute(): Promise<IGetReadinessResponseDTO> {
    return {
      status: 'ready',
      db: 'up',
      time: this.clock.now().toISOString(),
    };
  }
}
