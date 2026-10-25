import type { Terminal } from '../../src/entities/Terminal';
import type {
  ITerminalRepository,
  TerminalListFilter,
} from '../../src/repositories/ITerminalRepository';
import { ConflictError } from '../../src/shared/errors/AppError';

export class InMemoryTerminalRepository implements ITerminalRepository {
  private items = new Map<string, Terminal>();

  async findById(id: string) {
    const terminal = this.items.get(id);
    return terminal ? { ...terminal } : null;
  }

  async save(terminal: Terminal) {
    // The database has a unique index on the access point; the fake keeps the same promise.
    const taken = [...this.items.values()].some(
      (item) => item.accessPointId === terminal.accessPointId && item.id !== terminal.id,
    );
    if (taken) throw new ConflictError('CONFLICT', 'Este ponto de acesso já tem um terminal');
    this.items.set(terminal.id, { ...terminal });
  }

  async list(filter: TerminalListFilter) {
    const all = [...this.items.values()].sort(
      (a, b) => a.nome.localeCompare(b.nome) || a.id.localeCompare(b.id),
    );
    const start = (filter.page - 1) * filter.pageSize;
    return {
      items: all.slice(start, start + filter.pageSize).map((t) => ({ ...t })),
      total: all.length,
    };
  }
}
