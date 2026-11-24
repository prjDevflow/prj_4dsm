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
import { ListMyAccessEventsSchema, type IListMyAccessEventsDTO } from './ListMyAccessEvents_DTO';
import { ListMyAccessEventsUseCase } from './ListMyAccessEvents_UseCase';

const idOf = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const MARIA = makeUser({ id: idOf(2), nome: 'Maria Souza', email: 'maria@teste.local' });
const JOAO = makeUser({ id: idOf(3), nome: 'João Alves', email: 'joao@teste.local' });
const BUILDING = makeBuilding({ id: idOf(10) });
const GATE = makeAccessPoint({ id: idOf(20), buildingId: BUILDING.id });
const DOOR = makeAccessPoint({ id: idOf(21), buildingId: BUILDING.id, identificacao: 'PRT-01' });
const GATE_TERMINAL = makeTerminal({ id: idOf(30), accessPointId: GATE.id });
const DOOR_TERMINAL = makeTerminal({ id: idOf(31), accessPointId: DOOR.id });
const T = new Date('2026-10-20T14:00:00Z');

const query = (overrides: Partial<IListMyAccessEventsDTO> = {}): IListMyAccessEventsDTO => ({
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
  const sut = new ListMyAccessEventsUseCase(events);
  const idsOf = async (userId: string, input = query()) =>
    (await sut.execute(userId, input)).data.map((item) => item.id);
  return { sut, add, idsOf, events };
};

describe('ListMyAccessEvents', () => {
  it('deve devolver só os eventos do usuário do token', async () => {
    const { add, idsOf } = await makeSut();
    const mine = await add({ usuarioId: MARIA.id });
    const his = await add({ usuarioId: JOAO.id });
    await add({ usuarioId: null, resultado: 'NEGADO', motivo: 'TAG_DESCONHECIDA' });

    expect(await idsOf(MARIA.id)).toEqual([mine]);
    expect(await idsOf(JOAO.id)).toEqual([his]);
  });

  it('deve ignorar um usuarioId que venha na query', () => {
    const parsed = ListMyAccessEventsSchema.parse({ usuarioId: JOAO.id, metodo: 'NFC' });

    expect(parsed).toEqual({ metodo: 'NFC', page: 1, pageSize: 20 });
  });

  it('deve usar o id do token mesmo que a entrada traga outro usuarioId', async () => {
    const { sut, add } = await makeSut();
    const mine = await add({ usuarioId: MARIA.id });
    await add({ usuarioId: JOAO.id });
    // The schema already drops it, but the use case must not depend on that: the token wins by itself.
    const smuggled = { ...query(), usuarioId: JOAO.id } as IListMyAccessEventsDTO;

    const result = await sut.execute(MARIA.id, smuggled);

    expect(result.data.map((item) => item.id)).toEqual([mine]);
  });

  // Each row: the filter, an event that matches it and one that differs only in that field.
  const filters: Array<
    [
      string,
      IListMyAccessEventsDTO,
      Parameters<typeof makeAccessEvent>[0],
      Parameters<typeof makeAccessEvent>[0],
    ]
  > = [
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

  it.each(filters)(
    'deve filtrar por %s só dentro dos eventos do usuário',
    async (_name, input, matching, other) => {
      const { add, idsOf } = await makeSut();
      const hit = await add(matching);
      await add(other);
      await add({ ...matching, usuarioId: JOAO.id });

      expect(await idsOf(MARIA.id, input)).toEqual([hit]);
    },
  );

  it('deve paginar do mais recente para o mais antigo e informar o total', async () => {
    const { sut, add } = await makeSut();
    const oldest = await add({ ocorridoEm: new Date('2026-10-20T10:00:00Z') });
    const middle = await add({ ocorridoEm: new Date('2026-10-20T11:00:00Z') });
    const newest = await add({ ocorridoEm: new Date('2026-10-20T12:00:00Z') });
    await add({ usuarioId: JOAO.id });

    const first = await sut.execute(MARIA.id, query({ pageSize: 2 }));
    const second = await sut.execute(MARIA.id, query({ page: 2, pageSize: 2 }));

    expect(first).toMatchObject({ page: 1, pageSize: 2, total: 3 });
    expect(first.data.map((item) => item.id)).toEqual([newest, middle]);
    expect(second.data.map((item) => item.id)).toEqual([oldest]);
  });
});
