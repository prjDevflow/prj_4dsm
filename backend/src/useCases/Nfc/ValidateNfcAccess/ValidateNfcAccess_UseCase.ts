import type { NfcDenialReason } from '../../../entities/DenialReason';
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
    void input;
    throw new Error('B17: ainda não implementado');
  }
}
