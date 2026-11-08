import { AccessEvent } from '../../../entities/AccessEvent';
import { isNfcDenialReason, type NfcDenialReason } from '../../../entities/DenialReason';
import type { Terminal } from '../../../entities/Terminal';
import { AccessEvaluator } from '../../../entities/rules/AccessEvaluator';
import { normalizeUid } from '../../../entities/rules/normalizeUid';
import type { IClock } from '../../../providers/IClock';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { IAccessEventRepository } from '../../../repositories/IAccessEventRepository';
import type { IAccessGrantRepository } from '../../../repositories/IAccessGrantRepository';
import type { IAuthorizationRepository } from '../../../repositories/IAuthorizationRepository';
import type { INfcTagRepository } from '../../../repositories/INfcTagRepository';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import type { IUserRepository } from '../../../repositories/IUserRepository';
import { ConflictError } from '../../../shared/errors/AppError';
import type { AccessEventRecorder } from '../../Events/AccessEventRecorder';

export interface ValidateNfcAccessInput {
  /** From the key of the terminal. */
  terminalId: string;
  /** As the terminal wrote it; the use case normalizes it. */
  uid: string;
  /** The `Idempotency-Key` of the read, already checked at the edge. */
  idempotencyKey: string;
}

export interface ValidateNfcAccessConfig {
  /** `NFC_DEBOUNCE_SECONDS`. */
  debounceSeconds: number;
  /** `OPEN_DURATION_MS`. */
  aberturaMs: number;
}

/** The answer to the terminal, in the words of the contract (doc 03, section 4.5). A denial is a value. */
export type NfcAccessDecision =
  | { resultado: 'AUTORIZADO'; aberturaMs: number }
  | { resultado: 'NEGADO'; motivo: NfcDenialReason }
  | { resultado: 'CADASTRADA' };

export class ValidateNfcAccessUseCase {
  constructor(
    private terminals: ITerminalRepository,
    private tags: INfcTagRepository,
    private users: IUserRepository,
    private authorizations: IAuthorizationRepository,
    private events: IAccessEventRepository,
    private accessGrants: IAccessGrantRepository,
    private recorder: AccessEventRecorder,
    private ids: IIdGenerator,
    private clock: IClock,
    private config: ValidateNfcAccessConfig,
  ) {}

  async execute(input: ValidateNfcAccessInput): Promise<NfcAccessDecision> {
    const now = this.clock.now();
    const terminal = await this.terminals.findById(input.terminalId);
    const uid = normalizeUid(input.uid);
    if (!terminal || !uid) throw new Error('B17: ainda não implementado');

    // A retry of a read already decided gets the same answer, whatever changed since.
    const decided = await this.events.findByClientEventId(input.idempotencyKey);
    if (decided) return this.replay(decided, terminal.id);

    // The same tag read again in a burst is one attempt, not several (a card held against the reader).
    const since = new Date(now.getTime() - this.config.debounceSeconds * 1000);
    const recent = await this.events.findRecentNfc({ terminalId: terminal.id, uid, since });
    if (recent) return this.replay(recent, terminal.id);

    // Who is it, in the order of doc 03, section 5.2: the tag, then the person.
    const tag = await this.tags.findByUid(uid);
    if (!tag) return this.deny('TAG_DESCONHECIDA', { terminal, uid, input });
    if (!tag.ativa)
      return this.deny('TAG_INATIVA', { terminal, uid, input, userId: tag.usuarioId });
    const user = await this.users.findById(tag.usuarioId);
    // The foreign key makes the owner certain; if the row is gone anyway, the tag is as good as unknown.
    if (!user) return this.deny('TAG_DESCONHECIDA', { terminal, uid, input });
    if (!user.ativo) return this.deny('USUARIO_INATIVO', { terminal, uid, input, userId: user.id });

    const authorizations = await this.authorizations.findByUserAndAccessPoint(
      user.id,
      terminal.accessPointId,
    );
    const evaluation = AccessEvaluator.evaluate({
      user,
      accessPointId: terminal.accessPointId,
      authorizations,
      now,
    });
    if (!evaluation.granted) {
      return this.deny(evaluation.reason, { terminal, uid, input, userId: user.id });
    }

    const result = await this.accessGrants.commitNfcApproval({
      authorizationId: evaluation.authorization.id,
      event: AccessEvent.approved({
        id: this.ids.next(),
        ocorridoEm: now,
        metodo: 'NFC',
        terminalId: terminal.id,
        accessPointId: terminal.accessPointId,
        usuarioId: user.id,
        authorizationId: evaluation.authorization.id,
        clientEventId: input.idempotencyKey,
        uid,
      }),
    });
    if (!result.ok) throw new Error('B17: ainda não implementado');

    return { resultado: 'AUTORIZADO', aberturaMs: this.config.aberturaMs };
  }
  /** Records the denial (it never throws: the person is told no even if the event cannot be stored). */
  private async deny(
    reason: NfcDenialReason,
    attempt: { terminal: Terminal; uid: string; input: ValidateNfcAccessInput; userId?: string },
  ): Promise<NfcAccessDecision> {
    await this.recorder.recordDenied({
      metodo: 'NFC',
      motivo: reason,
      usuarioId: attempt.userId ?? null,
      terminalId: attempt.terminal.id,
      accessPointId: attempt.terminal.accessPointId,
      clientEventId: attempt.input.idempotencyKey,
      uid: attempt.uid,
    });
    return { resultado: 'NEGADO', motivo: reason };
  }
  /**
   * The answer an earlier read of this terminal got, read back from its event. A key that belongs to
   * another terminal, or to an event that was not an NFC read (a QR, a batch sent later), is a conflict.
   */
  private replay(event: AccessEvent, terminalId: string): NfcAccessDecision {
    if (event.terminalId === terminalId && event.metodo === 'NFC') {
      if (event.resultado === 'AUTORIZADO') {
        return { resultado: 'AUTORIZADO', aberturaMs: this.config.aberturaMs };
      }
      if (isNfcDenialReason(event.motivo)) return { resultado: 'NEGADO', motivo: event.motivo };
    }
    throw new ConflictError('CONFLICT', 'Esta Idempotency-Key já foi usada por outro evento');
  }
}
