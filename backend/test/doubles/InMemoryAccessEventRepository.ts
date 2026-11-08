import type { AccessEvent } from '../../src/entities/AccessEvent';
import type {
  AccessEventListFilter,
  IAccessEventRepository,
  RecentNfcQuery,
} from '../../src/repositories/IAccessEventRepository';
import type { InMemoryAccessPointRepository } from './InMemoryAccessPointRepository';
import type { InMemoryBuildingRepository } from './InMemoryBuildingRepository';
import type { InMemoryTerminalRepository } from './InMemoryTerminalRepository';
import type { InMemoryUserRepository } from './InMemoryUserRepository';

/** What `list` needs to resolve names, as the real repository does with joins. Only `list` uses it. */
export interface EventLookups {
  users: InMemoryUserRepository;
  accessPoints: InMemoryAccessPointRepository;
  buildings: InMemoryBuildingRepository;
  terminals: InMemoryTerminalRepository;
}

export class InMemoryAccessEventRepository implements IAccessEventRepository {
  private items: AccessEvent[] = [];
  private failure: Error | null = null;

  constructor(private lookups?: EventLookups) {}

  async list(_filter: AccessEventListFilter): Promise<never> {
    void this.lookups;
    throw new Error('não implementado');
  }

  async append(event: AccessEvent) {
    if (this.failure) throw this.failure;
    // The same unique index as the database: two events never share a `clientEventId`.
    const taken =
      event.clientEventId !== null &&
      this.items.some((item) => item.clientEventId === event.clientEventId);
    if (taken) throw new Error(`clientEventId ${event.clientEventId} já existe`);
    this.items.push({ ...event });
  }

  async findByClientEventId(clientEventId: string) {
    const found = this.items.find((item) => item.clientEventId === clientEventId);
    return found ? { ...found } : null;
  }

  async findRecentNfc({ terminalId, uid, since }: RecentNfcQuery) {
    const newestFirst = this.items
      .filter(
        (item) =>
          item.metodo === 'NFC' &&
          item.terminalId === terminalId &&
          item.detalhes?.uid === uid &&
          item.ocorridoEm.getTime() > since.getTime(),
      )
      .sort((a, b) => b.ocorridoEm.getTime() - a.ocorridoEm.getTime());
    return newestFirst[0] ? { ...newestFirst[0] } : null;
  }

  /** Makes every following `append` fail with `error`, like a database that stopped answering. */
  failWith(error: Error) {
    this.failure = error;
  }

  /** Not part of the port: the state to go back to when an approval fails halfway. */
  snapshot() {
    return [...this.items];
  }

  restore(snapshot: AccessEvent[]) {
    this.items = [...snapshot];
  }

  /** Everything stored, for assertions. */
  all() {
    return this.items.map((item) => ({ ...item }));
  }
}
