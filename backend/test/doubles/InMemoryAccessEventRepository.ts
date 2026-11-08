import type { AccessEvent } from '../../src/entities/AccessEvent';
import type {
  AccessEventDetails,
  AccessEventListFilter,
  AccessEventListResult,
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

  async list(filter: AccessEventListFilter): Promise<AccessEventListResult> {
    const matches = this.items
      .filter((e) => filter.usuarioId === undefined || e.usuarioId === filter.usuarioId)
      .filter((e) => filter.accessPointId === undefined || e.accessPointId === filter.accessPointId)
      .filter((e) => filter.terminalId === undefined || e.terminalId === filter.terminalId)
      .filter((e) => filter.metodo === undefined || e.metodo === filter.metodo)
      .filter((e) => filter.resultado === undefined || e.resultado === filter.resultado)
      .filter((e) => filter.motivo === undefined || e.motivo === filter.motivo)
      .filter((e) => filter.de === undefined || e.ocorridoEm.getTime() >= filter.de.getTime())
      .filter((e) => filter.ate === undefined || e.ocorridoEm.getTime() <= filter.ate.getTime())
      .sort((a, b) => b.ocorridoEm.getTime() - a.ocorridoEm.getTime() || b.id.localeCompare(a.id));
    const start = (filter.page - 1) * filter.pageSize;
    const page = matches.slice(start, start + filter.pageSize);
    return {
      items: await Promise.all(page.map((e) => this.toDetails(e))),
      total: matches.length,
    };
  }

  // The same read model the real repository builds with joins. A missing row is a mistake in the
  // test's setup (the database would refuse the event), so it fails loudly instead of becoming null.
  private async toDetails(event: AccessEvent): Promise<AccessEventDetails> {
    const lookups = this.lookups;
    if (!lookups)
      throw new Error('InMemoryAccessEventRepository.list precisa dos fakes de consulta');
    const found = <T>(row: T | null, what: string, id: string): T => {
      if (!row) throw new Error(`${what} ${id} não está nos fakes de consulta`);
      return row;
    };
    const usuario = event.usuarioId
      ? found(await lookups.users.findById(event.usuarioId), 'usuário', event.usuarioId)
      : null;
    const point = event.accessPointId
      ? found(
          await lookups.accessPoints.findById(event.accessPointId),
          'ponto',
          event.accessPointId,
        )
      : null;
    const building = point
      ? found(await lookups.buildings.findById(point.buildingId), 'edifício', point.buildingId)
      : null;
    const terminal = event.terminalId
      ? found(await lookups.terminals.findById(event.terminalId), 'terminal', event.terminalId)
      : null;
    return {
      id: event.id,
      ocorridoEm: event.ocorridoEm,
      metodo: event.metodo,
      resultado: event.resultado,
      motivo: event.motivo,
      distanciaM: event.distanciaM,
      authorizationId: event.authorizationId,
      usuario: usuario && { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil },
      local:
        point && building
          ? {
              id: point.id,
              nome: point.nome,
              tipo: point.tipo,
              edificio: { id: building.id, nome: building.nome },
            }
          : null,
      terminal: terminal && { id: terminal.id, nome: terminal.nome },
    };
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
