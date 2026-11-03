import type { NewDeniedEvent } from '../../entities/AccessEvent';
import type { IClock } from '../../providers/IClock';
import type { IIdGenerator } from '../../providers/IIdGenerator';
import type { ILogger } from '../../providers/ILogger';
import type { IAccessEventRepository } from '../../repositories/IAccessEventRepository';

/** What the caller knows; the recorder adds the id and the instant. */
export type RecordDeniedInput = Omit<NewDeniedEvent, 'id' | 'ocorridoEm'>;

export class AccessEventRecorder {
  constructor(
    private events: IAccessEventRepository,
    private ids: IIdGenerator,
    private clock: IClock,
    private logger: ILogger,
  ) {}

  async recordDenied(_input: RecordDeniedInput): Promise<void> {
    throw new Error('não implementado');
  }
}
