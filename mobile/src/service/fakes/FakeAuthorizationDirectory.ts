import { toIsoDate } from '@/lib/dateValue';
import type {
  Autorizacao,
  CreateAuthorizationBody,
  ListAuthorizationsParams,
  SituacaoEfetiva,
} from '@/lib/types/authorizations';
import type { Page } from '@/lib/types/page';
import { ApiError, type FieldError } from '../ApiError';
import type { FakeLocationDirectory } from './FakeLocationDirectory';
import type { FakeUserDirectory } from './FakeUserDirectory';

const ALL = { page: 1, pageSize: 1000 };
const DAY = 24 * 60 * 60 * 1000;

type Person = { id: string; nome: string };

type FakeAuthorizationOptions = {
  users: FakeUserDirectory;
  locations: FakeLocationDirectory;
  now?: () => Date;
};

type Sample = {
  pessoa: string;
  local: string;
  /** Days from today. */
  de: number;
  ate: number;
  horas: [string, string];
  usos: [realizados: number, permitidos: number];
  motivoCancelamento?: string;
};

// The examples of the Figma (T23), newest first: one of each state.
const samples: Sample[] = [
  {
    pessoa: 'Maria Souza',
    local: 'Catraca Social',
    de: -1,
    ate: 5,
    horas: ['08:00', '18:00'],
    usos: [1, 3],
  },
  {
    pessoa: 'João Pereira',
    local: 'Catraca Social',
    de: 0,
    ate: 0,
    horas: ['13:00', '15:00'],
    usos: [1, 2],
  },
  {
    pessoa: 'Ana Lima',
    local: 'Porta da Garagem',
    de: -19,
    ate: 70,
    horas: ['06:00', '09:00'],
    usos: [22, 60],
  },
  {
    pessoa: 'Bruno Alves',
    local: 'Catraca Social',
    de: -10,
    ate: 10,
    horas: ['08:00', '18:00'],
    usos: [4, 20],
    motivoCancelamento: 'Pedido do morador',
  },
  {
    pessoa: 'Maria Souza',
    local: 'Portaria Principal',
    de: 0,
    ate: 0,
    horas: ['09:00', '12:00'],
    usos: [2, 2],
  },
  {
    pessoa: 'João Pereira',
    local: 'Portaria Principal',
    de: -30,
    ate: -20,
    horas: ['08:00', '12:00'],
    usos: [0, 1],
  },
];

/**
 * Authorizations in memory, with the rules of the API (B08, B09): person and place must exist (404)
 * and be active (422), the end date is not before the start nor in the past, the end time is after
 * the start, 1 to 1000 uses, the effective state is computed on read and cancelling is idempotent.
 */
export class FakeAuthorizationDirectory {
  private readonly users: FakeUserDirectory;
  private readonly locations: FakeLocationDirectory;
  private readonly now: () => Date;
  private authorizations: Autorizacao[] = [];
  private nextId = 1;

  constructor({ users, locations, now = () => new Date() }: FakeAuthorizationOptions) {
    this.users = users;
    this.locations = locations;
    this.now = now;
    this.seed();
  }

  list({
    usuarioId,
    accessPointId,
    situacao,
    dataDe,
    dataAte,
    page,
    pageSize,
  }: ListAuthorizationsParams): Page<Autorizacao> {
    const found = this.authorizations
      .map((authorization) => this.withState(authorization))
      .filter((a) => usuarioId === undefined || a.usuario.id === usuarioId)
      .filter((a) => accessPointId === undefined || a.local.id === accessPointId)
      .filter((a) => situacao === undefined || a.situacaoEfetiva === situacao)
      .filter((a) => dataDe === undefined || a.dataFim >= dataDe)
      .filter((a) => dataAte === undefined || a.dataInicio <= dataAte)
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm) || b.id.localeCompare(a.id));
    const start = (page - 1) * pageSize;

    return { data: found.slice(start, start + pageSize), page, pageSize, total: found.length };
  }

  get(id: string): Autorizacao {
    return this.withState(this.find(id));
  }

  create(body: CreateAuthorizationBody, author: Person): Autorizacao {
    const usuario = this.users.get(body.usuarioId); // 404 when it does not exist
    const ap = this.locations.listAccessPoints(ALL).data.find((p) => p.id === body.accessPointId);
    if (!ap) throw new ApiError(404, 'NOT_FOUND', 'Ponto de acesso não encontrado');

    const details: FieldError[] = [];
    if (!usuario.ativo) details.push({ field: 'usuarioId', message: 'o usuário está inativo' });
    if (!ap.ativo) {
      details.push({ field: 'accessPointId', message: 'o ponto de acesso está inativo' });
    }
    if (body.dataFim < body.dataInicio) {
      details.push({ field: 'dataFim', message: 'deve ser igual ou depois de dataInicio' });
    } else if (body.dataFim < this.today()) {
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

    const authorization = this.build(body, author, this.now().toISOString());
    this.authorizations.push(authorization);
    return this.withState(authorization);
  }

  cancel(id: string, motivo: string | undefined, author: Person): Autorizacao {
    const authorization = this.find(id);
    if (authorization.situacao === 'ATIVA') {
      authorization.situacao = 'CANCELADA';
      authorization.canceladoPor = { id: author.id, nome: author.nome };
      authorization.canceladoEm = this.now().toISOString();
      authorization.motivoCancelamento = motivo?.trim() || null;
    }
    return this.withState(authorization);
  }

  private today() {
    return toIsoDate(this.now());
  }

  private find(id: string) {
    const authorization = this.authorizations.find((candidate) => candidate.id === id);
    if (!authorization) throw new ApiError(404, 'NOT_FOUND', 'Autorização não encontrada');
    return authorization;
  }

  private state(a: Autorizacao): SituacaoEfetiva {
    if (a.situacao === 'CANCELADA') return 'CANCELADA';
    if (a.dataFim < this.today()) return 'EXPIRADA';
    return a.usosRealizados >= a.usosPermitidos ? 'ESGOTADA' : 'ATIVA';
  }

  private withState(authorization: Autorizacao): Autorizacao {
    return {
      ...authorization,
      usosRestantes: Math.max(authorization.usosPermitidos - authorization.usosRealizados, 0),
      situacaoEfetiva: this.state(authorization),
    };
  }

  private build(body: CreateAuthorizationBody, author: Person, criadoEm: string): Autorizacao {
    const usuario = this.users.get(body.usuarioId);
    const ap = this.locations
      .listAccessPoints(ALL)
      .data.find((point) => point.id === body.accessPointId)!;
    const building = this.locations.listBuildings(ALL).data.find((b) => b.id === ap.buildingId)!;

    return {
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
      criadoPor: { id: author.id, nome: author.nome },
      criadoEm,
      canceladoPor: null,
      canceladoEm: null,
      motivoCancelamento: null,
    };
  }

  /** People or places missing from the given directories just leave their samples out. */
  private seed() {
    const admin = { id: 'fake-admin', nome: 'Administrador (dev)' };
    const dayOf = (days: number) => toIsoDate(new Date(this.now().getTime() + days * DAY));

    samples.forEach((sample, index) => {
      const person = this.users.list({ ...ALL, q: sample.pessoa }).data[0];
      const point = this.locations
        .listAccessPoints(ALL)
        .data.find((candidate) => candidate.nome === sample.local);
      if (!person || !point) return;

      const criadoEm = new Date(this.now().getTime() - (index + 1) * DAY).toISOString();
      const [usosRealizados, usosPermitidos] = sample.usos;
      const authorization = this.build(
        {
          usuarioId: person.id,
          accessPointId: point.id,
          dataInicio: dayOf(sample.de),
          dataFim: dayOf(sample.ate),
          horaInicio: sample.horas[0],
          horaFim: sample.horas[1],
          usosPermitidos,
        },
        admin,
        criadoEm,
      );
      authorization.usosRealizados = usosRealizados;
      if (sample.motivoCancelamento) {
        authorization.situacao = 'CANCELADA';
        authorization.canceladoPor = admin;
        authorization.canceladoEm = criadoEm;
        authorization.motivoCancelamento = sample.motivoCancelamento;
      }
      this.authorizations.push(authorization);
    });
  }
}
