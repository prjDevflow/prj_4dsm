import { AccessEvent, type AccessMethod, type AccessResult } from '../../../entities/AccessEvent';
import type { DenialReason } from '../../../entities/DenialReason';
import { isWithinOfflineWindow } from '../../../entities/rules/isWithinOfflineWindow';
import { normalizeUid } from '../../../entities/rules/normalizeUid';
import type { IClock } from '../../../providers/IClock';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { IAccessEventRepository } from '../../../repositories/IAccessEventRepository';
import type { INfcTagRepository } from '../../../repositories/INfcTagRepository';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import {
  UnauthorizedError,
  ValidationError,
  type ErrorDetails,
} from '../../../shared/errors/AppError';
import { UID_MESSAGE } from '../../Nfc/uidField';

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

    // The whole batch is checked before anything is stored: one bad event rejects all of them.
    const now = this.clock.now();
    const normalized = input.events.map((event) => normalizeUid(event.uid));
    const problems = input.events.flatMap((event, index) =>
      this.check(event, normalized[index] ?? null, index, now),
    );
    if (problems.length > 0) throw new ValidationError('Dados inválidos', problems);

    // `check` refused any UID that does not normalize, so none is null from here on.
    const uids = normalized as string[];
    const owners = await this.findOwners(uids);

    const events = input.events.map((event, index) => {
      const uid = uids[index] as string;
      return AccessEvent.denied({
        id: this.ids.next(),
        ocorridoEm: event.ocorridoEm,
        metodo: event.metodo,
        terminalId: terminal.id,
        accessPointId: terminal.accessPointId,
        // The tag tells who tried, active or not; an unknown tag leaves the person out.
        usuarioId: owners.get(uid) ?? null,
        clientEventId: event.clientEventId,
        uid,
        motivo: event.motivo,
      });
    });

    const stored = await this.events.appendIfAbsent(events);
    return { aceitos: stored, duplicados: events.length - stored };
  }

  /**
   * What is wrong with one event, one entry per field, in the order of the contract. A terminal that is
   * offline can only deny, so an approval, another method or another reason is not something it may send.
   */
  private check(
    event: OfflineEventInput,
    uid: string | null,
    index: number,
    now: Date,
  ): ErrorDetails {
    const problems: ErrorDetails = [];
    const at = (field: string) => `events.${index}.${field}`;
    if (event.metodo !== 'NFC') {
      problems.push({ field: at('metodo'), message: 'só NFC pode ser enviado em lote' });
    }
    if (!uid) problems.push({ field: at('uid'), message: UID_MESSAGE });
    if (!isWithinOfflineWindow(event.ocorridoEm, now)) {
      problems.push({
        field: at('ocorridoEm'),
        message: 'deve estar entre 7 dias antes e 5 minutos depois do horário do servidor',
      });
    }
    if (event.resultado !== 'NEGADO') {
      problems.push({
        field: at('resultado'),
        message:
          'o terminal sem conexão só envia NEGADO; uma aprovação não pode ser enviada em lote',
      });
    }
    if (event.motivo !== 'TERMINAL_OFFLINE') {
      problems.push({ field: at('motivo'), message: 'deve ser TERMINAL_OFFLINE' });
    }
    return problems;
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
