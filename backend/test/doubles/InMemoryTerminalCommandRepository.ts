import type { NewTerminalCommand, TerminalCommand } from '../../src/entities/TerminalCommand';
import type { ITerminalCommandRepository } from '../../src/repositories/ITerminalCommandRepository';

export class InMemoryTerminalCommandRepository implements ITerminalCommandRepository {
  private items = new Map<number, TerminalCommand>();
  private lastId = 0;
  private failure: Error | null = null;

  /** Makes every following `create` fail with `error`, like a database that stopped answering. */
  failWith(error: Error) {
    this.failure = error;
  }

  async create(command: NewTerminalCommand) {
    if (this.failure) throw this.failure;
    // Like the serial column: increasing, never reused.
    this.lastId += 1;
    const stored: TerminalCommand = {
      ...command,
      id: this.lastId,
      entregueEm: null,
      executadoEm: null,
    };
    this.items.set(stored.id, stored);
    return { ...stored };
  }

  async listPending(terminalId: string, after: number, limit: number, now: Date) {
    return [...this.items.values()]
      .filter(
        (item) =>
          item.terminalId === terminalId &&
          item.id > after &&
          item.expiraEm.getTime() >= now.getTime(),
      )
      .sort((a, b) => a.id - b.id)
      .slice(0, limit)
      .map((item) => ({ ...item }));
  }

  async markDelivered(ids: number[], at: Date) {
    for (const id of ids) {
      const item = this.items.get(id);
      if (item && item.entregueEm === null) item.entregueEm = at;
    }
  }

  async markExecuted(terminalId: string, id: number, at: Date) {
    const item = this.items.get(id);
    if (!item || item.terminalId !== terminalId) return false;
    if (item.executadoEm === null) item.executadoEm = at;
    return true;
  }

  async deleteExpiredBefore(cutoff: Date) {
    let deleted = 0;
    for (const [id, item] of this.items) {
      if (item.expiraEm.getTime() < cutoff.getTime()) {
        this.items.delete(id);
        deleted += 1;
      }
    }
    return deleted;
  }

  /**
   * Not part of the port: the state to go back to when an approval fails halfway. The id counter is
   * not restored, like a serial column: a rolled back insert still used its number.
   */
  snapshot() {
    return new Map(this.items);
  }

  restore(snapshot: Map<number, TerminalCommand>) {
    this.items = new Map(snapshot);
  }

  /** Everything stored, for assertions. */
  all() {
    return [...this.items.values()].map((item) => ({ ...item }));
  }
}
