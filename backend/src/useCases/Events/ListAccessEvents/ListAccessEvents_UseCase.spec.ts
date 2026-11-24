import { describe, expect, it } from 'vitest';
import {
  InMemoryAccessEventRepository,
  type EventLookups,
} from '../../../../test/doubles/InMemoryAccessEventRepository';
import { InMemoryAccessPointRepository } from '../../../../test/doubles/InMemoryAccessPointRepository';
import { InMemoryBuildingRepository } from '../../../../test/doubles/InMemoryBuildingRepository';
import { InMemoryTerminalRepository } from '../../../../test/doubles/InMemoryTerminalRepository';
import { InMemoryUserRepository } from '../../../../test/doubles/InMemoryUserRepository';
import { makeAccessEvent } from '../../../../test/factories/makeAccessEvent';
import { makeAccessPoint } from '../../../../test/factories/makeAccessPoint';
import { makeBuilding } from '../../../../test/factories/makeBuilding';
import { makeTerminal } from '../../../../test/factories/makeTerminal';
import { makeUser } from '../../../../test/factories/makeUser';
import type { IListAccessEventsDTO } from './ListAccessEvents_DTO';
import { ListAccessEventsUseCase } from './ListAccessEvents_UseCase';

const idOf = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const MARIA = makeUser({
  id: idOf(2),
  nome: 'Maria Souza',
  email: 'maria@teste.local',
  perfil: 'VISITANTE',
});
const JOAO = makeUser({ id: idOf(3), nome: 'João Alves', email: 'joao@teste.local' });
const BUILDING = makeBuilding({ id: idOf(10), nome: 'Edifício Central' });
const GATE = makeAccessPoint({ id: idOf(20), buildingId: BUILDING.id, nome: 'Catraca Social' });
const DOOR = makeAccessPoint({ id: idOf(21), buildingId: BUILDING.id, identificacao: 'PRT-01' });
const GATE_TERMINAL = makeTerminal({
  id: idOf(30),
  accessPointId: GATE.id,
  nome: 'Terminal Social',
});
const DOOR_TERMINAL = makeTerminal({ id: idOf(31), accessPointId: DOOR.id });
const T = new Date('2026-10-20T14:00:00Z');

const query = (overrides: Partial<IListAccessEventsDTO> = {}): IListAccessEventsDTO => ({
  page: 1,
  pageSize: 20,
  ...overrides,
});

const makeSut = async () => {
  const lookups: EventLookups = {
    users: new InMemoryUserRepository(),
    accessPoints: new InMemoryAccessPointRepository(),
    buildings: new InMemoryBuildingRepository(),
    terminals: new InMemoryTerminalRepository(),
  };
  for (const user of [MARIA, JOAO]) await lookups.users.save(user);
  await lookups.buildings.save(BUILDING);
  for (const point of [GATE, DOOR]) await lookups.accessPoints.save(point);
  for (const terminal of [GATE_TERMINAL, DOOR_TERMINAL]) await lookups.terminals.save(terminal);
  const events = new InMemoryAccessEventRepository(lookups);
  let next = 100;
  const add = async (overrides: Parameters<typeof makeAccessEvent>[0] = {}) => {
    const id = idOf(next++);
    await events.append(makeAccessEvent({ id, usuarioId: MARIA.id, ...overrides }));
    return id;
  };
  const sut = new ListAccessEventsUseCase(events);
  const idsOf = async (input = query()) => (await sut.execute(input)).data.map((item) => item.id);
  return { sut, add, idsOf };
};

type EventOverrides = Parameters<typeof makeAccessEvent>[0];

describe('ListAccessEvents', () => {
  it('deve devolver os eventos de todas as pessoas, do mais recente para o mais antigo', async () => {
    const { add, idsOf } = await makeSut();
    const oldest = await add({ ocorridoEm: new Date('2026-10-20T10:00:00Z') });
    const tieLow = await add({ usuarioId: JOAO.id, ocorridoEm: new Date('2026-10-20T11:00:00Z') });
    const tieHigh = await add({ ocorridoEm: new Date('2026-10-20T11:00:00Z') });
    const newest = await add({ usuarioId: null, ocorridoEm: new Date('2026-10-20T12:00:00Z') });

    expect(await idsOf()).toEqual([newest, tieHigh, tieLow, oldest]);
  });

  // Each row: the filter, an event that matches it and one that differs only in that field.
  const filters: Array<[string, IListAccessEventsDTO, EventOverrides, EventOverrides]> = [
    ['usuarioId', query({ usuarioId: MARIA.id }), { usuarioId: MARIA.id }, { usuarioId: JOAO.id }],
    [
      'accessPointId',
      query({ accessPointId: GATE.id }),
      { accessPointId: GATE.id },
      { accessPointId: DOOR.id },
    ],
    [
      'terminalId',
      query({ terminalId: GATE_TERMINAL.id }),
      { terminalId: GATE_TERMINAL.id },
      { terminalId: DOOR_TERMINAL.id },
    ],
    ['metodo', query({ metodo: 'NFC' }), { metodo: 'NFC' }, { metodo: 'QR' }],
    [
      'resultado',
      query({ resultado: 'NEGADO' }),
      { resultado: 'NEGADO', motivo: 'FORA_DO_PERIODO' },
      { resultado: 'AUTORIZADO' },
    ],
    [
      'motivo',
      query({ motivo: 'TAG_INATIVA' }),
      { resultado: 'NEGADO', motivo: 'TAG_INATIVA' },
      { resultado: 'NEGADO', motivo: 'TAG_DESCONHECIDA' },
    ],
    [
      'de (inclusivo)',
      query({ de: T }),
      { ocorridoEm: T },
      { ocorridoEm: new Date(T.getTime() - 1) },
    ],
    [
      'ate (inclusivo)',
      query({ ate: T }),
      { ocorridoEm: T },
      { ocorridoEm: new Date(T.getTime() + 1) },
    ],
  ];

  it.each(filters)('deve filtrar por %s', async (_name, input, matching, other) => {
    const { add, idsOf } = await makeSut();
    const hit = await add(matching);
    await add(other);

    expect(await idsOf(input)).toEqual([hit]);
  });

  it('deve combinar os filtros: só vale o evento que atende a todos', async () => {
    const { add, idsOf } = await makeSut();
    const hit = await add({
      metodo: 'NFC',
      resultado: 'NEGADO',
      motivo: 'TAG_INATIVA',
      usuarioId: MARIA.id,
    });
    await add({ metodo: 'NFC', resultado: 'NEGADO', motivo: 'TAG_INATIVA', usuarioId: JOAO.id });
    await add({ metodo: 'QR', resultado: 'NEGADO', motivo: 'TAG_INATIVA', usuarioId: MARIA.id });
    await add({ metodo: 'NFC', resultado: 'AUTORIZADO', usuarioId: MARIA.id });

    const input = query({
      usuarioId: MARIA.id,
      metodo: 'NFC',
      resultado: 'NEGADO',
      motivo: 'TAG_INATIVA',
    });

    expect(await idsOf(input)).toEqual([hit]);
  });

  it('deve trazer usuário, local com edifício e terminal já resolvidos', async () => {
    const { sut, add } = await makeSut();
    const id = await add({
      ocorridoEm: T,
      terminalId: GATE_TERMINAL.id,
      accessPointId: GATE.id,
      authorizationId: idOf(40),
      distanciaM: 42.5,
    });

    const { data } = await sut.execute(query());

    expect(data).toEqual([
      {
        id,
        ocorridoEm: T,
        metodo: 'QR',
        resultado: 'AUTORIZADO',
        motivo: null,
        distanciaM: 42.5,
        authorizationId: idOf(40),
        usuario: { id: MARIA.id, nome: 'Maria Souza', perfil: 'VISITANTE' },
        local: {
          id: GATE.id,
          nome: 'Catraca Social',
          tipo: 'CATRACA',
          edificio: { id: BUILDING.id, nome: 'Edifício Central' },
        },
        terminal: { id: GATE_TERMINAL.id, nome: 'Terminal Social' },
      },
    ]);
  });

  it('deve devolver usuario, local e terminal nulos quando a tentativa não os identificou', async () => {
    const { sut, add } = await makeSut();
    await add({ usuarioId: null, resultado: 'NEGADO', motivo: 'CREDENCIAL_INVALIDA' });

    const [event] = (await sut.execute(query())).data;

    expect(event).toMatchObject({ usuario: null, local: null, terminal: null });
  });

  it('não deve trazer detalhes nem a chave de idempotência do evento', async () => {
    const { sut, add } = await makeSut();
    await add({
      metodo: 'NFC',
      terminalId: GATE_TERMINAL.id,
      accessPointId: GATE.id,
      clientEventId: '8d0f3f2e-6a5b-4c7e-9c1d-2b3a4f5e6d7c',
      detalhes: { uid: '04A1B2C3', credencialHashPrefixo: 'abcd1234' },
    });

    const [event] = (await sut.execute(query())).data;

    expect(Object.keys(event!).sort()).toEqual(
      [
        'authorizationId',
        'distanciaM',
        'id',
        'local',
        'metodo',
        'motivo',
        'ocorridoEm',
        'resultado',
        'terminal',
        'usuario',
      ].sort(),
    );
  });

  it('deve paginar e informar o total', async () => {
    const { sut, add } = await makeSut();
    const ids = [
      await add({ ocorridoEm: new Date('2026-10-20T10:00:00Z') }),
      await add({ ocorridoEm: new Date('2026-10-20T11:00:00Z') }),
      await add({ ocorridoEm: new Date('2026-10-20T12:00:00Z') }),
    ];

    const second = await sut.execute(query({ page: 2, pageSize: 2 }));

    expect(second).toMatchObject({ page: 2, pageSize: 2, total: 3 });
    expect(second.data.map((item) => item.id)).toEqual([ids[0]]);
  });
});
