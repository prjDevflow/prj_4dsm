import { AccessEvent, type NewDeniedEvent } from '../../entities/AccessEvent';
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

  /**
   * Never throws: a denial must reach the person even when the event cannot be stored. The failure is
   * logged with the context of the attempt (never the credential hash or token) so it can be found.
   */
  async recordDenied(input: RecordDeniedInput): Promise<void> {
    try {
      const event = AccessEvent.denied({
        ...input,
        id: this.ids.next(),
        ocorridoEm: this.clock.now(),
      });
      await this.events.append(event);
    } catch (error) {
      this.logger.error('Falha ao gravar o evento de acesso negado', {
        motivo: input.motivo,
        metodo: input.metodo,
        terminalId: input.terminalId ?? null,
        accessPointId: input.accessPointId ?? null,
        usuarioId: input.usuarioId ?? null,
        erro: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
