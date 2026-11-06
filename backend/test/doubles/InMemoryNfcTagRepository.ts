import type { NfcTag } from '../../src/entities/NfcTag';
import type {
  INfcTagRepository,
  NfcTagDetails,
  NfcTagListFilter,
} from '../../src/repositories/INfcTagRepository';
import { ConflictError } from '../../src/shared/errors/AppError';
import type { InMemoryUserRepository } from './InMemoryUserRepository';

export class InMemoryNfcTagRepository implements INfcTagRepository {
  private items = new Map<string, NfcTag>();

  constructor(private users: InMemoryUserRepository) {}

  async save(tag: NfcTag) {
    // Insert only, and the database has a unique index on the UID; the fake keeps the same promise.
    if (this.items.has(tag.id)) throw new Error(`tag ${tag.id} já existe`);
    if ([...this.items.values()].some((item) => item.uid === tag.uid)) {
      throw new ConflictError('TAG_JA_CADASTRADA', 'Esta tag já está vinculada a alguém');
    }
    if (!(await this.users.findById(tag.usuarioId))) {
      throw new Error(`usuário ${tag.usuarioId} não existe`);
    }
    this.items.set(tag.id, { ...tag });
  }

  async findByUid(uid: string) {
    const tag = [...this.items.values()].find((item) => item.uid === uid);
    return tag ? { ...tag } : null;
  }

  async list(filter: NfcTagListFilter) {
    const matches = [...this.items.values()]
      .filter((t) => filter.usuarioId === undefined || t.usuarioId === filter.usuarioId)
      .filter((t) => filter.ativa === undefined || t.ativa === filter.ativa)
      .sort((a, b) => b.criadaEm.getTime() - a.criadaEm.getTime() || a.id.localeCompare(b.id));
    const start = (filter.page - 1) * filter.pageSize;
    const page = matches.slice(start, start + filter.pageSize);
    return {
      items: await Promise.all(page.map((t) => this.toDetails(t))),
      total: matches.length,
    };
  }

  async update(id: string, changes: { ativa: boolean }) {
    const tag = this.items.get(id);
    if (!tag) return null;
    const updated = { ...tag, ativa: changes.ativa };
    this.items.set(id, updated);
    return this.toDetails(updated);
  }

  private async toDetails(tag: NfcTag): Promise<NfcTagDetails> {
    const user = await this.users.findById(tag.usuarioId);
    if (!user) throw new Error(`usuário ${tag.usuarioId} não existe`);
    return { tag: { ...tag }, usuario: { id: user.id, nome: user.nome } };
  }
}
