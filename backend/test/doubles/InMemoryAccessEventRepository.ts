import type { AccessEvent } from '../../src/entities/AccessEvent';
import type {
  IAccessEventRepository,
  RecentNfcQuery,
} from '../../src/repositories/IAccessEventRepository';

export class InMemoryAccessEventRepository implements IAccessEventRepository {
  private items: AccessEvent[] = [];
  private failure: Error | null = null;

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
