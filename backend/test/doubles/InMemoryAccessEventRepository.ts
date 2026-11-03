import type { AccessEvent } from '../../src/entities/AccessEvent';
import type { IAccessEventRepository } from '../../src/repositories/IAccessEventRepository';

export class InMemoryAccessEventRepository implements IAccessEventRepository {
  private items: AccessEvent[] = [];
  private failure: Error | null = null;

  async append(event: AccessEvent) {
    if (this.failure) throw this.failure;
    this.items.push({ ...event });
  }

  /** Makes every following `append` fail with `error`, like a database that stopped answering. */
  failWith(error: Error) {
    this.failure = error;
  }

  /** Everything stored, for assertions. */
  all() {
    return this.items.map((item) => ({ ...item }));
  }
}
