import type {
  EventoDeAcesso,
  ListAccessEventsParams,
  ListMyAccessEventsParams,
} from '@/lib/types/accessEvents';
import type { Page } from '@/lib/types/page';
import { sampleCondomino, sampleVisitante } from './sampleData';

const person = ({ id, nome, perfil }: typeof sampleVisitante) => ({ id, nome, perfil });

const central = { id: '5eed0000-0000-4000-8000-000000000004', nome: 'Edifício Central' };
const social = {
  id: '5eed0000-0000-4000-8000-000000000005',
  nome: 'Catraca Social',
  tipo: 'CATRACA' as const,
  edificio: central,
};
const garagem = {
  id: '5eed0000-0000-4000-8000-000000000009',
  nome: 'Porta da Garagem',
  tipo: 'PORTA' as const,
  edificio: central,
};
const terminalSocial = { id: '5eed0000-0000-4000-8000-000000000006', nome: 'Terminal Social' };
const terminalGaragem = { id: '5eed0000-0000-4000-8000-000000000010', nome: 'Terminal da Garagem' };

type Sample = Omit<EventoDeAcesso, 'id' | 'ocorridoEm'> & { minutesAgo: number };

const samples: Sample[] = [
  {
    minutesAgo: 12,
    metodo: 'QR',
    resultado: 'AUTORIZADO',
    motivo: null,
    distanciaM: 14,
    authorizationId: '5eed0000-0000-4000-8000-000000000007',
    usuario: person(sampleVisitante),
    local: social,
    terminal: terminalSocial,
  },
  {
    minutesAgo: 40,
    metodo: 'QR',
    resultado: 'NEGADO',
    motivo: 'CREDENCIAL_EXPIRADA',
    distanciaM: null,
    authorizationId: null,
    usuario: person(sampleVisitante),
    local: social,
    terminal: terminalSocial,
  },
  {
    minutesAgo: 95,
    metodo: 'NFC',
    resultado: 'NEGADO',
    motivo: 'TAG_DESCONHECIDA',
    distanciaM: null,
    authorizationId: null,
    usuario: null,
    local: garagem,
    terminal: terminalGaragem,
  },
  {
    minutesAgo: 180,
    metodo: 'NFC',
    resultado: 'AUTORIZADO',
    motivo: null,
    distanciaM: null,
    authorizationId: '5eed0000-0000-4000-8000-000000000008',
    usuario: person(sampleCondomino),
    local: garagem,
    terminal: terminalGaragem,
  },
  {
    minutesAgo: 60 * 26,
    metodo: 'QR',
    resultado: 'NEGADO',
    motivo: 'DISTANTE_DO_TERMINAL',
    distanciaM: 212,
    authorizationId: '5eed0000-0000-4000-8000-000000000007',
    usuario: person(sampleVisitante),
    local: social,
    terminal: terminalSocial,
  },
  {
    minutesAgo: 60 * 27,
    metodo: 'NFC',
    resultado: 'NEGADO',
    motivo: 'FORA_DO_PERIODO',
    distanciaM: null,
    authorizationId: null,
    usuario: person(sampleCondomino),
    local: garagem,
    terminal: terminalGaragem,
  },
  {
    minutesAgo: 60 * 50,
    metodo: 'QR',
    resultado: 'NEGADO',
    motivo: 'CREDENCIAL_INVALIDA',
    distanciaM: null,
    authorizationId: null,
    usuario: person(sampleCondomino),
    local: null,
    terminal: null,
  },
  {
    minutesAgo: 60 * 75,
    metodo: 'NFC',
    resultado: 'NEGADO',
    motivo: 'TERMINAL_OFFLINE',
    distanciaM: null,
    authorizationId: null,
    usuario: person(sampleCondomino),
    local: garagem,
    terminal: terminalGaragem,
  },
  {
    minutesAgo: 60 * 120,
    metodo: 'QR',
    resultado: 'AUTORIZADO',
    motivo: null,
    distanciaM: 8,
    authorizationId: '5eed0000-0000-4000-8000-000000000007',
    usuario: person(sampleVisitante),
    local: social,
    terminal: terminalSocial,
  },
];

/** Attempts of the last days, relative to `now`, so the default period of T26 shows them. */
export const sampleAccessEvents = (now = new Date()): EventoDeAcesso[] =>
  samples.map(({ minutesAgo, ...event }, index) => ({
    ...event,
    id: `e7e70000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    ocorridoEm: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
  }));

const at = (instant: string) => new Date(instant).getTime();

/** Answers /access-events like the B18: newest first, combined filters, inclusive period. */
export class FakeAccessEventDirectory {
  constructor(private events: EventoDeAcesso[] = sampleAccessEvents()) {}

  list(params: ListAccessEventsParams): Page<EventoDeAcesso> {
    const { page, pageSize } = params;
    const matching = this.events
      .filter(
        (event) =>
          (!params.usuarioId || event.usuario?.id === params.usuarioId) &&
          (!params.accessPointId || event.local?.id === params.accessPointId) &&
          (!params.terminalId || event.terminal?.id === params.terminalId) &&
          (!params.metodo || event.metodo === params.metodo) &&
          (!params.resultado || event.resultado === params.resultado) &&
          (!params.motivo || event.motivo === params.motivo) &&
          (!params.de || at(event.ocorridoEm) >= at(params.de)) &&
          (!params.ate || at(event.ocorridoEm) <= at(params.ate)),
      )
      .sort((a, b) => at(b.ocorridoEm) - at(a.ocorridoEm) || b.id.localeCompare(a.id));
    const start = (page - 1) * pageSize;
    return {
      data: matching.slice(start, start + pageSize),
      page,
      pageSize,
      total: matching.length,
    };
  }

  listMine(usuarioId: string, params: ListMyAccessEventsParams): Page<EventoDeAcesso> {
    return this.list({ ...params, usuarioId });
  }
}
