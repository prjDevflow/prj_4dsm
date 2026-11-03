import { useSessionStore } from '@/context/SessionStore';
import { toIsoDate } from '@/lib/dateValue';
import type { Autorizacao, CreateAuthorizationBody } from '@/lib/types/authorizations';
import { ApiError, type FieldError } from '../ApiError';
import type { ICreateAuthorizationService } from '../IAuthorizationService';
import type { FakeLocationDirectory } from './FakeLocationDirectory';
import { sharedLocationDirectory } from './FakeLocationServices';
import type { FakeUserDirectory } from './FakeUserDirectory';
import { sharedUserDirectory } from './FakeUserServices';

const ALL = { page: 1, pageSize: 1000 };

type FakeAuthorizationOptions = {
  users?: FakeUserDirectory;
  locations?: FakeLocationDirectory;
  now?: () => Date;
};

/**
 * Creates authorizations with the rules of the API (B08): person and place must exist (404) and
 * be active (422), the end date is not before the start nor in the past, the end time is after
 * the start, and 1 to 1000 uses. In fake mode it uses the same people and places as the other fakes.
 */
export class FakeCreateAuthorizationService implements ICreateAuthorizationService {
  readonly calls: CreateAuthorizationBody[] = [];
  readonly created: Autorizacao[] = [];
  private readonly users: FakeUserDirectory;
  private readonly locations: FakeLocationDirectory;
  private readonly now: () => Date;
  private nextId = 1;

  constructor({
    users = sharedUserDirectory,
    locations = sharedLocationDirectory,
    now = () => new Date(),
  }: FakeAuthorizationOptions = {}) {
    this.users = users;
    this.locations = locations;
    this.now = now;
  }

  async exec(body: CreateAuthorizationBody): Promise<Autorizacao> {
    this.calls.push(body);
    const usuario = this.users.get(body.usuarioId); // 404 when it does not exist
    const ap = this.locations.listAccessPoints(ALL).data.find((p) => p.id === body.accessPointId);
    if (!ap) throw new ApiError(404, 'NOT_FOUND', 'Ponto de acesso não encontrado');
    const building = this.locations.listBuildings(ALL).data.find((b) => b.id === ap.buildingId)!;

    const details: FieldError[] = [];
    if (!usuario.ativo) details.push({ field: 'usuarioId', message: 'o usuário está inativo' });
    if (!ap.ativo) {
      details.push({ field: 'accessPointId', message: 'o ponto de acesso está inativo' });
    }
    if (body.dataFim < body.dataInicio) {
      details.push({ field: 'dataFim', message: 'deve ser igual ou depois de dataInicio' });
    } else if (body.dataFim < toIsoDate(this.now())) {
      details.push({ field: 'dataFim', message: 'não pode estar no passado' });
    }
    if (body.horaFim <= body.horaInicio) {
      details.push({ field: 'horaFim', message: 'deve ser depois de horaInicio' });
    }
    if (
      !Number.isInteger(body.usosPermitidos) ||
      body.usosPermitidos < 1 ||
      body.usosPermitidos > 1000
    ) {
      details.push({ field: 'usosPermitidos', message: 'deve ser de 1 a 1000' });
    }
    if (details.length > 0) throw new ApiError(422, 'VALIDATION_ERROR', 'Dados inválidos', details);

    const admin = useSessionStore.getState().usuario;
    const authorization: Autorizacao = {
      id: `fake-autorizacao-${this.nextId++}`,
      usuario: { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil },
      local: {
        id: ap.id,
        nome: ap.nome,
        tipo: ap.tipo,
        edificio: { id: building.id, nome: building.nome },
      },
      ...body,
      usosRealizados: 0,
      usosRestantes: body.usosPermitidos,
      situacao: 'ATIVA',
      situacaoEfetiva: 'ATIVA',
      criadoPor: { id: admin?.id ?? '', nome: admin?.nome ?? '' },
      criadoEm: this.now().toISOString(),
      canceladoPor: null,
      canceladoEm: null,
      motivoCancelamento: null,
    };
    this.created.push(authorization);
    return authorization;
  }
}
