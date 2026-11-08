import { AccessEvent } from '../../../entities/AccessEvent';
import type { NfcDenialReason } from '../../../entities/DenialReason';
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

    const tag = await this.tags.findByUid(uid);
    if (!tag) throw new Error('B17: ainda não implementado');
    const user = await this.users.findById(tag.usuarioId);
    if (!user) throw new Error('B17: ainda não implementado');

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
    if (!evaluation.granted) throw new Error('B17: ainda não implementado');

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
}
