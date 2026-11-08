import type { AccessMethod, AccessResult } from '../../../entities/AccessEvent';
import type { DenialReason } from '../../../entities/DenialReason';
import type { IClock } from '../../../providers/IClock';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { IAccessEventRepository } from '../../../repositories/IAccessEventRepository';
import type { INfcTagRepository } from '../../../repositories/INfcTagRepository';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';

/** One attempt the terminal kept while it had no connection, as it sends it. */
export interface OfflineEventInput {
  /** Chosen by the terminal; the unique key that makes a resend harmless. Lowercase (the edge makes it so). */
  clientEventId: string;
  metodo: AccessMethod;
  /** As the terminal wrote it; the use case normalizes it. */
  uid: string;
  /** The terminal's clock. */
  ocorridoEm: Date;
  resultado: AccessResult;
  motivo: DenialReason;
}

export interface IngestOfflineEventsInput {
  /** From the key of the terminal. */
  terminalId: string;
  events: OfflineEventInput[];
}

export interface IngestOfflineEventsResult {
  aceitos: number;
  duplicados: number;
}

export class IngestOfflineEventsUseCase {
  constructor(
    private terminals: ITerminalRepository,
    private tags: INfcTagRepository,
    private events: IAccessEventRepository,
    private ids: IIdGenerator,
    private clock: IClock,
  ) {}

  async execute(_input: IngestOfflineEventsInput): Promise<IngestOfflineEventsResult> {
    void this.terminals;
    void this.tags;
    void this.events;
    void this.ids;
    void this.clock;
    return { aceitos: 0, duplicados: 0 };
  }
}
