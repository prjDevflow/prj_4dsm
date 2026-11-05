import type { QrCredential } from '../../src/entities/QrCredential';
import type { IQrCredentialRepository } from '../../src/repositories/IQrCredentialRepository';

export class InMemoryQrCredentialRepository implements IQrCredentialRepository {
  private items = new Map<string, QrCredential>();

  async saveIfIdle(credential: QrCredential, previousIssueUntil: Date) {
    // Same condition as the real conditional write: no issue for this terminal after the limit.
    const tooSoon = [...this.items.values()].some(
      (item) =>
        item.terminalId === credential.terminalId &&
        item.emitidoEm.getTime() > previousIssueUntil.getTime(),
    );
    if (tooSoon) return false;
    // The database has a unique index on the hash; the fake keeps the same promise.
    if ([...this.items.values()].some((item) => item.tokenHash === credential.tokenHash)) {
      throw new Error('tokenHash já existe');
    }
    this.items.set(credential.id, { ...credential });
    return true;
  }

  async findByTokenHash(tokenHash: string) {
    const found = [...this.items.values()].find((item) => item.tokenHash === tokenHash);
    return found ? { ...found } : null;
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

  /** Everything stored, for assertions. */
  all() {
    return [...this.items.values()].map((item) => ({ ...item }));
  }

  /**
   * Not part of the port: marks an unused credential as used, as the approval does. False when it was
   * already used (the real conditional write cannot tell that from an unknown id either).
   */
  consumeIfUnused(id: string, userId: string, at: Date) {
    const item = this.items.get(id);
    if (!item || item.consumidoEm !== null) return false;
    this.items.set(id, { ...item, consumidoEm: at, consumidoPorId: userId });
    return true;
  }

  /** Not part of the port: the state to go back to when an approval fails halfway. */
  snapshot() {
    return new Map(this.items);
  }

  restore(snapshot: Map<string, QrCredential>) {
    this.items = new Map(snapshot);
  }

  /** Puts a credential in without the rate-limit check, to set the scene of a test. */
  seed(credential: QrCredential) {
    this.items.set(credential.id, { ...credential });
  }
}
