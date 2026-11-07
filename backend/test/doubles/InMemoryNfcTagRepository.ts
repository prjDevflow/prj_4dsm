import type { NfcTag } from '../../src/entities/NfcTag';
import type { INfcTagRepository, NfcTagListFilter } from '../../src/repositories/INfcTagRepository';
import { ConflictError } from '../../src/shared/errors/AppError';

export class InMemoryNfcTagRepository implements INfcTagRepository {
  private items = new Map<string, NfcTag>();

  async save(tag: NfcTag) {
    // Insert only, like the real repository, and with the same unique index on the UID.
    if (this.items.has(tag.id)) throw new Error(`tag ${tag.id} já existe`);
    const taken = [...this.items.values()].some((item) => item.uid === tag.uid);
    if (taken) throw new ConflictError('TAG_JA_CADASTRADA', 'Esta tag já está cadastrada');
    this.items.set(tag.id, { ...tag });
  }

  async updateStatus(id: string, ativa: boolean) {
    const tag = this.items.get(id);
    if (!tag) return null;
    const updated = { ...tag, ativa };
    this.items.set(id, updated);
    return { ...updated };
  }

  async list(filter: NfcTagListFilter) {
    const matches = [...this.items.values()]
      .filter((tag) => filter.usuarioId === undefined || tag.usuarioId === filter.usuarioId)
      .filter((tag) => filter.ativa === undefined || tag.ativa === filter.ativa)
      .sort((a, b) => b.criadaEm.getTime() - a.criadaEm.getTime() || b.id.localeCompare(a.id));
    const start = (filter.page - 1) * filter.pageSize;
    return {
      items: matches.slice(start, start + filter.pageSize).map((tag) => ({ ...tag })),
      total: matches.length,
    };
  }

  /** Everything stored, in insertion order (for assertions). */
  all() {
    return [...this.items.values()].map((tag) => ({ ...tag }));
  }

  /** Puts a tag straight into the store, as if it had been there before the test began. */
  async seed(tag: NfcTag) {
    await this.save(tag);
  }
}
