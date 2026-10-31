import type { Authorization } from '../../src/entities/Authorization';
import type {
  AuthorizationDetails,
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
    if (!authorization) return null;
    // The database guarantees these rows through foreign keys; the fake fails loudly instead.
    const user = await this.users.findById(authorization.usuarioId);
    const author = await this.users.findById(authorization.criadoPorId);
    const canceller = authorization.canceladoPorId
      ? await this.users.findById(authorization.canceladoPorId)
      : null;
    const point = await this.accessPoints.findById(authorization.accessPointId);
    const building = point ? await this.buildings.findById(point.buildingId) : null;
    if (!user || !author || !point || !building) {
      throw new Error(`Fake incompleto para a autorização ${id}`);
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

  /** Not part of the port: lets a test see every stored authorization. */
  all() {
    return [...this.items.values()].map((a) => ({ ...a }));
  }
}
