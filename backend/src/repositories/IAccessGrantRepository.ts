import type { AccessEvent } from '../entities/AccessEvent';
import type { NewTerminalCommand } from '../entities/TerminalCommand';

export interface CommitApprovalInput {
  credentialId: string;
  /** Who used the credential (stored as `consumidoPorId`). */
  userId: string;
  authorizationId: string;
  now: Date;
  /** The `AUTORIZADO` event, already built. */
  event: AccessEvent;
  /** The `ABRIR` command, already built. */
  command: NewTerminalCommand;
}

export type CommitApprovalResult =
  | { ok: true; usosRestantes: number }
  | { ok: false; reason: 'CREDENCIAL_REUTILIZADA' | 'USOS_ESGOTADOS' };

/** The approval of an access: everything happens together or nothing does. */
export interface IAccessGrantRepository {
  /**
   * In one transaction: (1) marks the credential as used, only if it still was not; (2) consumes one use
   * of the authorization, only while its status is `ATIVA` and it has uses left; (3) stores the event;
   * (4) stores the command. A lost race at (1) or (2) is a value (`ok: false`) and leaves nothing behind:
   * the credential is not marked when the uses ran out. A failure at (3) or (4) is thrown, and nothing
   * stays (no use consumed, no credential marked): an access is never granted without its event.
   */
  commitApproval(input: CommitApprovalInput): Promise<CommitApprovalResult>;
}
