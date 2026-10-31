import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { makeLocationDoubles } from '../../../../test/doubles/InMemoryLocationUnitOfWork';
import { makeAccessPoint } from '../../../../test/factories/makeAccessPoint';
import { makeAuthorization } from '../../../../test/factories/makeAuthorization';
import { makeBuilding } from '../../../../test/factories/makeBuilding';
import { makeUser } from '../../../../test/factories/makeUser';
import type { IListAuthorizationsDTO } from './ListAuthorizations_DTO';
import { ListAuthorizationsUseCase } from './ListAuthorizations_UseCase';

const idOf = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = makeUser({ id: idOf(1), nome: 'Admin', perfil: 'ADMIN' });
const MARIA = makeUser({ id: idOf(2), nome: 'Maria Souza', email: 'maria@teste.local' });
const JOAO = makeUser({ id: idOf(3), nome: 'João Alves', email: 'joao@teste.local' });
const BUILDING = makeBuilding({ id: idOf(10) });
const GATE = makeAccessPoint({ id: idOf(20), buildingId: BUILDING.id, nome: 'Catraca Social' });
const DOOR = makeAccessPoint({
  id: idOf(21),
  buildingId: BUILDING.id,
  nome: 'Porta do Bloco A',
  identificacao: 'A-01',
});

// 2026-10-20 11:00 in São Paulo
const NOW = new Date('2026-10-20T14:00:00Z');

const query = (overrides: Partial<IListAuthorizationsDTO> = {}): IListAuthorizationsDTO => ({
  page: 1,
  pageSize: 20,
  ...overrides,
});

const makeSut = async () => {
  const doubles = makeLocationDoubles();
  for (const user of [ADMIN, MARIA, JOAO]) await doubles.users.save(user);
  await doubles.buildings.save(BUILDING);
  for (const point of [GATE, DOOR]) await doubles.accessPoints.save(point);
  let next = 100;
  /** Seeds one authorization; each new one is created a minute after the previous. */
  const add = (overrides: Parameters<typeof makeAuthorization>[0] = {}) => {
    const id = idOf(next);
    doubles.authorizations.add(
      makeAuthorization({
        id,
        usuarioId: MARIA.id,
        accessPointId: GATE.id,
        criadoPorId: ADMIN.id,
        criadoEm: new Date(NOW.getTime() - 3_600_000 + (next++ - 100) * 60_000),
        ...overrides,
      }),
    );
    return id;
  };
  const sut = new ListAuthorizationsUseCase(doubles.authorizations, new FakeClock(NOW));
  const idsOf = async (input: IListAuthorizationsDTO) =>
    (await sut.execute(input)).data.map((item) => item.id);
  return { sut, add, idsOf, ...doubles };
};

describe('ListAuthorizations', () => {
  it('deve listar as mais recentes primeiro, com o objeto completo e a paginação', async () => {
    const { sut, add } = await makeSut();
    const older = add();
    const newer = add({ usuarioId: JOAO.id, accessPointId: DOOR.id, usosRealizados: 1 });

    const page = await sut.execute(query());

    expect(page).toMatchObject({ page: 1, pageSize: 20, total: 2 });
    expect(page.data.map((item) => item.id)).toEqual([newer, older]);
    expect(page.data[0]).toMatchObject({
      usuario: { id: JOAO.id, nome: 'João Alves' },
      local: { id: DOOR.id, nome: 'Porta do Bloco A' },
      criadoPor: { id: ADMIN.id, nome: 'Admin' },
      usosRestantes: 2,
      situacaoEfetiva: 'ATIVA',
    });
  });

  it('deve filtrar por usuarioId', async () => {
    const { add, idsOf } = await makeSut();
    const maria = add({ usuarioId: MARIA.id });
    add({ usuarioId: JOAO.id });

    expect(await idsOf(query({ usuarioId: MARIA.id }))).toEqual([maria]);
  });

  it('deve filtrar por accessPointId', async () => {
    const { add, idsOf } = await makeSut();
    add({ accessPointId: GATE.id });
    const door = add({ accessPointId: DOOR.id });

    expect(await idsOf(query({ accessPointId: DOOR.id }))).toEqual([door]);
  });

  it('deve filtrar por situação efetiva', async () => {
    const { add, idsOf } = await makeSut();
    const active = add({ dataFim: '2026-10-31' });
    const spent = add({ dataFim: '2026-10-31', usosRealizados: 3 });
    const expired = add({ dataFim: '2026-10-19' });
    const cancelled = add({ dataFim: '2026-10-31', situacao: 'CANCELADA' });

    expect(await idsOf(query({ situacao: 'ATIVA' }))).toEqual([active]);
    expect(await idsOf(query({ situacao: 'ESGOTADA' }))).toEqual([spent]);
    expect(await idsOf(query({ situacao: 'EXPIRADA' }))).toEqual([expired]);
    expect(await idsOf(query({ situacao: 'CANCELADA' }))).toEqual([cancelled]);
  });

  it('deve dar a precedência CANCELADA, EXPIRADA, ESGOTADA, ATIVA ao filtrar por situação', async () => {
    const { add, idsOf } = await makeSut();
    const cancelledAndExpired = add({ dataFim: '2026-10-19', situacao: 'CANCELADA' });
    const expiredAndSpent = add({ dataFim: '2026-10-19', usosRealizados: 3 });
    const lastDaySpent = add({ dataFim: '2026-10-20', usosRealizados: 3 });

    expect(await idsOf(query({ situacao: 'CANCELADA' }))).toEqual([cancelledAndExpired]);
    expect(await idsOf(query({ situacao: 'EXPIRADA' }))).toEqual([expiredAndSpent]);
    expect(await idsOf(query({ situacao: 'ESGOTADA' }))).toEqual([lastDaySpent]);
    expect(await idsOf(query({ situacao: 'ATIVA' }))).toEqual([]);
  });

  it('deve incluir as pontas de dataDe e dataAte e excluir um dia fora', async () => {
    const { add, idsOf } = await makeSut();
    const endsOnFrom = add({ dataInicio: '2026-10-01', dataFim: '2026-10-10' });
    add({ dataInicio: '2026-10-01', dataFim: '2026-10-09' });
    const startsOnTo = add({ dataInicio: '2026-10-20', dataFim: '2026-10-30' });
    add({ dataInicio: '2026-10-21', dataFim: '2026-10-30' });

    const found = await idsOf(query({ dataDe: '2026-10-10', dataAte: '2026-10-20' }));

    expect(found.sort()).toEqual([endsOnFrom, startsOnTo].sort());
  });

  it('deve combinar os filtros', async () => {
    const { add, idsOf } = await makeSut();
    const target = add({ usuarioId: MARIA.id, accessPointId: GATE.id, dataFim: '2026-10-31' });
    add({ usuarioId: JOAO.id, accessPointId: GATE.id, dataFim: '2026-10-31' });
    add({ usuarioId: MARIA.id, accessPointId: DOOR.id, dataFim: '2026-10-31' });
    add({ usuarioId: MARIA.id, accessPointId: GATE.id, dataFim: '2026-10-31', usosRealizados: 3 });

    const found = await idsOf(
      query({
        usuarioId: MARIA.id,
        accessPointId: GATE.id,
        situacao: 'ATIVA',
        dataDe: '2026-10-25',
      }),
    );

    expect(found).toEqual([target]);
  });

  it('deve paginar e informar o total', async () => {
    const { sut, add } = await makeSut();
    const ids = [add(), add(), add(), add(), add()];

    const second = await sut.execute(query({ page: 2, pageSize: 2 }));

    expect(second).toMatchObject({ page: 2, pageSize: 2, total: 5 });
    expect(second.data.map((item) => item.id)).toEqual([ids[2], ids[1]]);
  });
});
