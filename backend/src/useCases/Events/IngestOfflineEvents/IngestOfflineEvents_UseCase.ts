import { AccessEvent, type AccessMethod, type AccessResult } from '../../../entities/AccessEvent';
import type { DenialReason } from '../../../entities/DenialReason';
import { normalizeUid } from '../../../entities/rules/normalizeUid';
import type { IClock } from '../../../providers/IClock';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { IAccessEventRepository } from '../../../repositories/IAccessEventRepository';
import type { INfcTagRepository } from '../../../repositories/INfcTagRepository';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import { UnauthorizedError, ValidationError } from '../../../shared/errors/AppError';

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

  async execute(input: IngestOfflineEventsInput): Promise<IngestOfflineEventsResult> {
    // The key of the terminal was valid a moment ago; a terminal gone since has no one to answer.
    const terminal = await this.terminals.findById(input.terminalId);
    if (!terminal) throw new UnauthorizedError();

    const uids = input.events.map((event, index) => {
      const uid = normalizeUid(event.uid);
      if (!uid) {
        throw new ValidationError('Dados inválidos', [
          { field: `events.${index}.uid`, message: 'UID inválido' },
        ]);
      }
      return uid;
    });
    const owners = await this.findOwners(uids);

    const events = input.events.map((event, index) =>
      AccessEvent.denied({
        id: this.ids.next(),
        ocorridoEm: event.ocorridoEm,
        metodo: event.metodo,
        terminalId: terminal.id,
        accessPointId: terminal.accessPointId,
        // The tag tells who tried, active or not; an unknown tag leaves the person out.
        usuarioId: owners.get(uids[index]!) ?? null,
        clientEventId: event.clientEventId,
        uid: uids[index],
        motivo: event.motivo,
      }),
    );

    const stored = await this.events.appendIfAbsent(events);
    return { aceitos: stored, duplicados: events.length - stored };
  }

  /** The user each distinct UID belongs to, looked up once per UID however often the batch repeats it. */
  private async findOwners(uids: string[]): Promise<Map<string, string>> {
    const owners = new Map<string, string>();
    for (const uid of new Set(uids)) {
      const tag = await this.tags.findByUid(uid);
      if (tag) owners.set(uid, tag.usuarioId);
    }
    return owners;
  }
}
