import type { IClock } from '../../../providers/IClock';
import type { IGetHealthResponseDTO } from './GetHealth_DTO';

export class GetHealthUseCase {
  constructor(
    private clock: IClock,
    private config: { version: string },
  ) {}

  execute(): IGetHealthResponseDTO {
    throw new Error('Not implemented');
  }
}
