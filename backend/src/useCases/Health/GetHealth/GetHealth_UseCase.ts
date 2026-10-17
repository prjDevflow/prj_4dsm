import type { IClock } from '../../../providers/IClock';
import type { IGetHealthResponseDTO } from './GetHealth_DTO';

export class GetHealthUseCase {
  constructor(
    private clock: IClock,
    private config: { version: string },
  ) {}

  execute(): IGetHealthResponseDTO {
    return {
      status: 'ok',
      version: this.config.version,
      time: this.clock.now().toISOString(),
    };
  }
}
