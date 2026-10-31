import type { Terminal } from '../../src/entities/Terminal';
import type {
  ITerminalRepository,
  TerminalHeartbeat,
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
    // Insert only, like the real repository: changes go through updateDetails and replaceKeyHash.
    if (this.items.has(terminal.id)) throw new Error(`terminal ${terminal.id} já existe`);
    // The database has a unique index on the access point; the fake keeps the same promise.
    const taken = [...this.items.values()].some(
      (item) => item.accessPointId === terminal.accessPointId,
    );
    if (taken) throw new ConflictError('CONFLICT', 'Este ponto de acesso já tem um terminal');
    this.items.set(terminal.id, { ...terminal });
  }

  async updateDetails(id: string, changes: { nome?: string; ativo?: boolean }) {
    const terminal = this.items.get(id);
    if (!terminal) return null;
    const updated = {
      ...terminal,
      nome: changes.nome ?? terminal.nome,
      ativo: changes.ativo ?? terminal.ativo,
    };
    this.items.set(id, updated);
    return { ...updated };
  }

  async replaceKeyHash(id: string, apiKeyHash: string) {
    const terminal = this.items.get(id);
    if (!terminal) return false;
    this.items.set(id, { ...terminal, apiKeyHash });
    return true;
  }

  async updateHeartbeat(id: string, heartbeat: TerminalHeartbeat, previousContactUntil: Date) {
    const terminal = this.items.get(id);
    if (!terminal) return false;
    // Same condition as the real conditional write: never heard from, or heard from long enough ago.
    const { ultimoContatoEm } = terminal;
    if (ultimoContatoEm && ultimoContatoEm.getTime() > previousContactUntil.getTime()) return false;
    this.items.set(id, {
      ...terminal,
      ultimoContatoEm: heartbeat.contatoEm,
      gpsFix: heartbeat.gpsFix,
      gpsSimulado: heartbeat.gpsSimulado,
      firmware: heartbeat.firmware,
      rssi: heartbeat.rssi,
      // Without a fix the stored position stays.
      ultimaLat: heartbeat.posicao?.latitude ?? terminal.ultimaLat,
      ultimaLon: heartbeat.posicao?.longitude ?? terminal.ultimaLon,
    });
    return true;
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
