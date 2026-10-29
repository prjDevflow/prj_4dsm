import type { Authorization } from '../../src/entities/Authorization';
import { computeEffectiveStatus } from '../../src/entities/rules/computeEffectiveStatus';
import type {
  AuthorizationDetails,
  AuthorizationListFilter,
  IAuthorizationRepository,
} from '../../src/repositories/IAuthorizationRepository';
import type { InMemoryAccessPointRepository } from './InMemoryAccessPointRepository';
import type { InMemoryBuildingRepository } from './InMemoryBuildingRepository';
import type { InMemoryUserRepository } from './InMemoryUserRepository';

export class InMemoryAuthorizationRepository implements IAuthorizationRepository {
  private items = new Map<string, Authorization>();

  constructor(
    private accessPoints: InMemoryAccessPointRepository,
    private buildings: InMemoryBuildingRepository,
    private users: InMemoryUserRepository,
  ) {}

  /** Seeds the fake without going through `save`. */
  add(authorization: Authorization) {
    this.items.set(authorization.id, { ...authorization });
  }

  async save(authorization: Authorization) {
    this.items.set(authorization.id, { ...authorization });
  }

  async findViewById(id: string): Promise<AuthorizationDetails | null> {
    const authorization = this.items.get(id);
    return authorization ? this.toDetails(authorization) : null;
  }

  async list(filter: AuthorizationListFilter) {
    const matches = [...this.items.values()]
      .filter((a) => filter.usuarioId === undefined || a.usuarioId === filter.usuarioId)
      .filter((a) => filter.accessPointId === undefined || a.accessPointId === filter.accessPointId)
      .filter(
        (a) =>
          filter.situacao === undefined ||
          computeEffectiveStatus(a, filter.now) === filter.situacao,
      )
      .filter((a) => filter.dataDe === undefined || a.dataFim >= filter.dataDe)
      .filter((a) => filter.dataAte === undefined || a.dataInicio <= filter.dataAte)
      .sort((a, b) =>
        filter.sort === 'recent'
          ? b.criadoEm.getTime() - a.criadoEm.getTime() || b.id.localeCompare(a.id)
          : a.dataFim.localeCompare(b.dataFim) || a.id.localeCompare(b.id),
      );
    const start = (filter.page - 1) * filter.pageSize;
    const page = matches.slice(start, start + filter.pageSize);
    return {
      items: await Promise.all(page.map((a) => this.toDetails(a))),
      total: matches.length,
    };
  }

  async cancelIfActive(input: {
    id: string;
    canceladoPorId: string;
    canceladoEm: Date;
    motivo: string | null;
  }) {
    const current = this.items.get(input.id);
    if (!current || current.situacao !== 'ATIVA') return false;
    this.items.set(input.id, {
      ...current,
      situacao: 'CANCELADA',
      canceladoPorId: input.canceladoPorId,
      canceladoEm: input.canceladoEm,
      motivoCancelamento: input.motivo,
    });
    return true;
  }

  async hasActiveNonExpiredForAccessPoint(accessPointId: string, today: string) {
    return [...this.items.values()].some(
      (a) => a.accessPointId === accessPointId && a.situacao === 'ATIVA' && a.dataFim >= today,
    );
  }

  async hasActiveNonExpiredForBuilding(buildingId: string, today: string) {
    const pointIds = new Set(
      this.accessPoints
        .all()
        .filter((p) => p.buildingId === buildingId)
        .map((p) => p.id),
    );
    return [...this.items.values()].some(
      (a) => pointIds.has(a.accessPointId) && a.situacao === 'ATIVA' && a.dataFim >= today,
    );
  }

  private async toDetails(authorization: Authorization): Promise<AuthorizationDetails> {
    // The database guarantees these rows through foreign keys; the fake fails loudly instead.
    const user = await this.users.findById(authorization.usuarioId);
    const author = await this.users.findById(authorization.criadoPorId);
    const canceller = authorization.canceladoPorId
      ? await this.users.findById(authorization.canceladoPorId)
      : null;
    const point = await this.accessPoints.findById(authorization.accessPointId);
    const building = point ? await this.buildings.findById(point.buildingId) : null;
    if (!user || !author || !point || !building) {
      throw new Error(`Fake incompleto para a autorização ${authorization.id}`);
    }
    return {
      authorization: { ...authorization },
      usuario: { id: user.id, nome: user.nome, perfil: user.perfil },
      local: {
        id: point.id,
        nome: point.nome,
        tipo: point.tipo,
        edificio: { id: building.id, nome: building.nome },
      },
      criadoPor: { id: author.id, nome: author.nome },
      canceladoPor: canceller ? { id: canceller.id, nome: canceller.nome } : null,
    };
  }

  /** Not part of the port: lets a test see every stored authorization. */
  all() {
    return [...this.items.values()].map((a) => ({ ...a }));
  }
}
