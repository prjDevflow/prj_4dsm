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

  it.todo('deve filtrar por usuarioId');
  it.todo('deve filtrar por accessPointId');
  it.todo('deve filtrar por situação efetiva');
  it.todo('deve dar a precedência CANCELADA, EXPIRADA, ESGOTADA, ATIVA ao filtrar por situação');
  it.todo('deve incluir as pontas de dataDe e dataAte e excluir um dia fora');
  it.todo('deve combinar os filtros');
  it.todo('deve paginar e informar o total');
});
