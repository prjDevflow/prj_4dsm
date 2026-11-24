import type {
  CommitApprovalInput,
  CommitApprovalResult,
  CommitNfcApprovalInput,
  CommitNfcApprovalResult,
  IAccessGrantRepository,
} from '../../src/repositories/IAccessGrantRepository';
import type { InMemoryAccessEventRepository } from './InMemoryAccessEventRepository';
import type { InMemoryAuthorizationRepository } from './InMemoryAuthorizationRepository';
import type { InMemoryQrCredentialRepository } from './InMemoryQrCredentialRepository';
import type { InMemoryTerminalCommandRepository } from './InMemoryTerminalCommandRepository';

/**
 * Same promise as the real approval: all or nothing, and the same two `reason` values. Instead of a
 * transaction it takes a snapshot of the four stores and goes back to it on any failure.
 */
export class InMemoryAccessGrantRepository implements IAccessGrantRepository {
  constructor(
    private credentials: InMemoryQrCredentialRepository,
    private authorizations: InMemoryAuthorizationRepository,
    private events: InMemoryAccessEventRepository,
    private commands: InMemoryTerminalCommandRepository,
  ) {}

  async commitApproval(input: CommitApprovalInput): Promise<CommitApprovalResult> {
    const before = {
      credentials: this.credentials.snapshot(),
      authorizations: this.authorizations.snapshot(),
      events: this.events.snapshot(),
      commands: this.commands.snapshot(),
    };
    const rollback = () => {
      this.credentials.restore(before.credentials);
      this.authorizations.restore(before.authorizations);
      this.events.restore(before.events);
      this.commands.restore(before.commands);
    };

    try {
      if (!this.credentials.consumeIfUnused(input.credentialId, input.userId, input.now)) {
        return { ok: false, reason: 'CREDENCIAL_REUTILIZADA' };
      }
      const usosRestantes = this.authorizations.consumeUseIfAvailable(input.authorizationId);
      if (usosRestantes === null) {
        // The credential was marked a moment ago: a denial must not consume it.
        rollback();
        return { ok: false, reason: 'USOS_ESGOTADOS' };
      }
      await this.events.append(input.event);
      await this.commands.create(input.command);
      return { ok: true, usosRestantes };
    } catch (error) {
      rollback();
      throw error;
    }
  }

  async commitNfcApproval(input: CommitNfcApprovalInput): Promise<CommitNfcApprovalResult> {
    // The key first, like the real one: nothing is touched when it is already taken.
    const { clientEventId } = input.event;
    if (clientEventId !== null && (await this.events.findByClientEventId(clientEventId))) {
      return { ok: false, reason: 'CHAVE_REPETIDA' };
    }

    const before = {
      authorizations: this.authorizations.snapshot(),
      events: this.events.snapshot(),
    };
    const rollback = () => {
      this.authorizations.restore(before.authorizations);
      this.events.restore(before.events);
    };

    try {
      await this.events.append(input.event);
      const usosRestantes = this.authorizations.consumeUseIfAvailable(input.authorizationId);
      if (usosRestantes === null) {
        // The event was stored a moment ago: a denial leaves no approval behind.
        rollback();
        return { ok: false, reason: 'USOS_ESGOTADOS' };
      }
      return { ok: true, usosRestantes };
    } catch (error) {
      rollback();
      throw error;
    }
  }
}
