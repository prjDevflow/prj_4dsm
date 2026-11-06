import type {
  ChaveDoTerminal,
  CreateAccessPointBody,
  CreateBuildingBody,
  CreateTerminalBody,
  Edificio,
  ListParams,
  PontoDeAcesso,
  Terminal,
  UpdateAccessPointBody,
  UpdateBuildingBody,
  UpdateTerminalBody,
} from '@/lib/types/locations';
import type { Page } from '@/lib/types/page';
import { ApiError } from '../ApiError';

const ONLINE_WINDOW_MS = 30_000;
const MINUTE = 60_000;

const notFound = (what: string) => new ApiError(404, 'NOT_FOUND', `${what} não encontrado`);

const invalid = (field: string, message: string) =>
  new ApiError(422, 'VALIDATION_ERROR', 'Dados inválidos', [{ field, message }]);

const byName = <T extends { nome: string; id: string }>(a: T, b: T) =>
  a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }) || a.id.localeCompare(b.id);

const page = <T>(items: T[], { page: number, pageSize }: ListParams): Page<T> => ({
  data: items.slice((number - 1) * pageSize, number * pageSize),
  page: number,
  pageSize,
  total: items.length,
});

const KEY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Same shape as the real key (32 bytes in base64url); the fake keeps none of them. */
const newKey = () =>
  Array.from({ length: 43 }, () => KEY_CHARS[Math.floor(Math.random() * KEY_CHARS.length)]).join(
    '',
  );

type StoredTerminal = Omit<Terminal, 'online'>;

type FakeLocationOptions = { now?: () => Date };

/**
 * Buildings, access points and terminals in memory, with the rules of the API (B07, B11): unique
 * identification per building, one terminal per access point, no deactivating a place that still
 * has active authorizations, and "online" for a contact in the last 30 s. Starts with the places
 * of the Figma (T17, T20).
 */
export class FakeLocationDirectory {
  private readonly now: () => Date;
  private nextId = 1;
  private buildings: Edificio[];
  private accessPoints: PontoDeAcesso[];
  private terminals: StoredTerminal[];
  /** Access points with active authorizations (only "Catraca Social" in the sample). */
  private withAuthorizations = new Set<string>();

  constructor({ now = () => new Date() }: FakeLocationOptions = {}) {
    this.now = now;
    const at = (minutesAgo: number) =>
      new Date(this.now().getTime() - minutesAgo * MINUTE).toISOString();

    const central = this.building('Edifício Central', 'Rua das Acácias, 120', -23.30512, -45.96551);
    const anexo = this.building('Edifício Anexo', 'Rua das Acácias, 140', -23.30561, -45.96502);
    this.buildings = [central, anexo];

    const portaria = this.point(central, 'PORTARIA', 'Portaria Principal', 'POR-01');
    const social = this.point(central, 'CATRACA', 'Catraca Social', 'CAT-01');
    const garagem = this.point(central, 'PORTA', 'Porta da Garagem', 'POR-02');
    const catracaAnexo = {
      ...this.point(anexo, 'CATRACA', 'Catraca do Anexo', 'CAT-02'),
      ativo: false,
    };
    this.accessPoints = [portaria, social, garagem, catracaAnexo];
    this.withAuthorizations.add(social.id);

    this.terminals = [
      this.terminal(garagem, 'Terminal da Garagem', at(12)),
      this.terminal(social, 'Terminal Social', at(0.2)),
      this.terminal(portaria, 'Terminal da Portaria', at(0.1)),
      { ...this.terminal(catracaAnexo, 'Terminal do Anexo', at(9 * 24 * 60)), ativo: false },
    ];
  }

  // Buildings

  listBuildings(params: ListParams): Page<Edificio> {
    return page(
      [...this.buildings].sort(byName).map((b) => ({ ...b })),
      params,
    );
  }

  createBuilding(body: CreateBuildingBody): Edificio {
    const building: Edificio = { id: this.id(), ...body, nome: body.nome.trim() };
    this.buildings.push(building);
    return { ...building };
  }

  updateBuilding(id: string, body: UpdateBuildingBody): Edificio {
    const building = this.buildings.find((candidate) => candidate.id === id);
    if (!building) throw notFound('Edifício');
    const points = this.accessPoints.filter((ap) => ap.buildingId === id);

    if (body.ativo === false && building.ativo) {
      if (points.some((ap) => this.withAuthorizations.has(ap.id)))
        throw this.activeAuthorizations();
      points.forEach((ap) => (ap.ativo = false));
    }
    Object.assign(building, body);
    return { ...building };
  }

  // Access points

  listAccessPoints(params: ListParams): Page<PontoDeAcesso> {
    return page(
      [...this.accessPoints].sort(byName).map((ap) => ({ ...ap })),
      params,
    );
  }

  createAccessPoint(body: CreateAccessPointBody): PontoDeAcesso {
    const building = this.buildings.find((candidate) => candidate.id === body.buildingId);
    if (!building) throw notFound('Edifício');
    if (!building.ativo) throw invalid('buildingId', 'o edifício está inativo');
    this.assertUniqueIdentification(body.buildingId, body.identificacao);

    const ap: PontoDeAcesso = { id: this.id(), ...body, identificacao: body.identificacao.trim() };
    this.accessPoints.push(ap);
    return { ...ap };
  }

  updateAccessPoint(id: string, body: UpdateAccessPointBody): PontoDeAcesso {
    if ('buildingId' in body) throw invalid('buildingId', 'campo não permitido');
    const ap = this.accessPoints.find((candidate) => candidate.id === id);
    if (!ap) throw notFound('Ponto de acesso');

    if (body.ativo === false && ap.ativo && this.withAuthorizations.has(id)) {
      throw this.activeAuthorizations();
    }
    const building = this.buildings.find((candidate) => candidate.id === ap.buildingId);
    if (body.ativo === true && !building?.ativo) {
      throw invalid('ativo', 'o edifício deste ponto está inativo');
    }
    if (body.identificacao !== undefined && body.identificacao !== ap.identificacao) {
      this.assertUniqueIdentification(ap.buildingId, body.identificacao);
    }
    Object.assign(ap, body);
    return { ...ap };
  }

  // Terminals

  listTerminals(params: ListParams): Page<Terminal> {
    return page(
      [...this.terminals].sort(byName).map((t) => this.withStatus(t)),
      params,
    );
  }

  getTerminal(id: string): Terminal {
    return this.withStatus(this.findTerminal(id));
  }

  createTerminal({ accessPointId, nome }: CreateTerminalBody): ChaveDoTerminal {
    const ap = this.accessPoints.find((candidate) => candidate.id === accessPointId);
    if (!ap) throw notFound('Ponto de acesso');
    if (!ap.ativo) throw invalid('accessPointId', 'o ponto de acesso está inativo');
    if (this.terminals.some((t) => t.accessPointId === accessPointId)) {
      throw new ApiError(409, 'CONFLICT', 'Este ponto de acesso já tem um terminal');
    }
    const terminal = this.terminal(ap, nome.trim(), null);
    this.terminals.push(terminal);
    return { id: terminal.id, apiKey: newKey() };
  }

  updateTerminal(id: string, body: UpdateTerminalBody): Terminal {
    const terminal = this.findTerminal(id);
    Object.assign(terminal, body);
    return this.withStatus(terminal);
  }

  rotateKey(id: string): ChaveDoTerminal {
    this.findTerminal(id);
    return { id, apiKey: newKey() };
  }

  // Helpers

  private id() {
    return `fake-local-${this.nextId++}`;
  }

  private building(nome: string, endereco: string, latitude: number, longitude: number): Edificio {
    return { id: this.id(), nome, endereco, latitude, longitude, ativo: true };
  }

  private point(
    building: Edificio,
    tipo: PontoDeAcesso['tipo'],
    nome: string,
    identificacao: string,
  ): PontoDeAcesso {
    const { latitude, longitude } = building;
    return {
      id: this.id(),
      buildingId: building.id,
      tipo,
      nome,
      identificacao,
      latitude,
      longitude,
      ativo: true,
    };
  }

  private terminal(
    ap: PontoDeAcesso,
    nome: string,
    ultimoContatoEm: string | null,
  ): StoredTerminal {
    const seen = ultimoContatoEm !== null;
    return {
      id: this.id(),
      accessPointId: ap.id,
      nome,
      ativo: true,
      ultimoContatoEm,
      ultimaLat: seen ? ap.latitude : null,
      ultimaLon: seen ? ap.longitude : null,
      gpsFix: seen,
      gpsSimulado: false,
      firmware: seen ? '0.3.0' : null,
      rssi: seen ? -61 : null,
    };
  }

  private findTerminal(id: string) {
    const terminal = this.terminals.find((candidate) => candidate.id === id);
    if (!terminal) throw notFound('Terminal');
    return terminal;
  }

  private withStatus(terminal: StoredTerminal): Terminal {
    const last = terminal.ultimoContatoEm ? new Date(terminal.ultimoContatoEm).getTime() : null;
    const online = last !== null && this.now().getTime() - last < ONLINE_WINDOW_MS;
    return { ...terminal, online };
  }

  private assertUniqueIdentification(buildingId: string, identificacao: string) {
    const wanted = identificacao.trim().toLowerCase();
    const taken = this.accessPoints.some(
      (ap) => ap.buildingId === buildingId && ap.identificacao.toLowerCase() === wanted,
    );
    if (taken) {
      throw new ApiError(
        409,
        'CONFLICT',
        'Já existe um ponto de acesso com esta identificação no edifício',
      );
    }
  }

  private activeAuthorizations() {
    return new ApiError(
      409,
      'LOCAL_COM_AUTORIZACOES_ATIVAS',
      'Este local ainda tem autorizações ativas. Cancele-as antes.',
    );
  }
}
