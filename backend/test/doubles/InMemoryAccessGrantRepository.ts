import type {
  CommitApprovalInput,
  CommitApprovalResult,
  IAccessGrantRepository,
} from '../../src/repositories/IAccessGrantRepository';
import type { InMemoryAccessEventRepository } from './InMemoryAccessEventRepository';
import type { InMemoryAuthorizationRepository } from './InMemoryAuthorizationRepository';
import type { InMemoryQrCredentialRepository } from './InMemoryQrCredentialRepository';
import type { InMemoryTerminalCommandRepository } from './InMemoryTerminalCommandRepository';

export class InMemoryAccessGrantRepository implements IAccessGrantRepository {
  constructor(
    private credentials: InMemoryQrCredentialRepository,
    private authorizations: InMemoryAuthorizationRepository,
    private events: InMemoryAccessEventRepository,
    private commands: InMemoryTerminalCommandRepository,
  ) {}

  async commitApproval(_input: CommitApprovalInput): Promise<CommitApprovalResult> {
    void this.credentials;
    void this.authorizations;
    void this.events;
    void this.commands;
    throw new Error('não implementado');
  }
}
