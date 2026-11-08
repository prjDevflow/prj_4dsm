import type { IClock } from '../../../providers/IClock';
import type { IDatabaseProbe } from '../../../providers/IDatabaseProbe';
import type { IGetReadinessResponseDTO } from './GetReadiness_DTO';

export class GetReadinessUseCase {
  constructor(
    private clock: IClock,
    private database: IDatabaseProbe,
  ) {}

  async execute(): Promise<IGetReadinessResponseDTO> {
    void this.clock;
    void this.database;
    throw new Error('não implementado');
  }
}
