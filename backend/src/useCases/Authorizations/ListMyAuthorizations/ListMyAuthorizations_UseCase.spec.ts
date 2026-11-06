import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { makeLocationDoubles } from '../../../../test/doubles/InMemoryLocationUnitOfWork';
import { makeAccessPoint } from '../../../../test/factories/makeAccessPoint';
import { makeAuthorization } from '../../../../test/factories/makeAuthorization';
import { makeBuilding } from '../../../../test/factories/makeBuilding';
import { makeUser } from '../../../../test/factories/makeUser';
import {
  ListMyAuthorizationsSchema,
  type IListMyAuthorizationsDTO,
} from './ListMyAuthorizations_DTO';
import { ListMyAuthorizationsUseCase } from './ListMyAuthorizations_UseCase';

const idOf = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = makeUser({ id: idOf(1), nome: 'Admin', perfil: 'ADMIN' });
const MARIA = makeUser({ id: idOf(2), nome: 'Maria Souza', email: 'maria@teste.local' });
const JOAO = makeUser({ id: idOf(3), nome: 'João Alves', email: 'joao@teste.local' });
const BUILDING = makeBuilding({ id: idOf(10) });
const GATE = makeAccessPoint({ id: idOf(20), buildingId: BUILDING.id });

// 2026-10-20 11:00 in São Paulo
const NOW = new Date('2026-10-20T14:00:00Z');

const query = (overrides: Partial<IListMyAuthorizationsDTO> = {}): IListMyAuthorizationsDTO => ({
  page: 1,
  pageSize: 20,
  ...overrides,
});

const makeSut = async () => {
  const doubles = makeLocationDoubles();
  for (const user of [ADMIN, MARIA, JOAO]) await doubles.users.save(user);
  await doubles.buildings.save(BUILDING);
  await doubles.accessPoints.save(GATE);
  let next = 100;
  const add = (overrides: Parameters<typeof makeAuthorization>[0] = {}) => {
    const id = idOf(next++);
    doubles.authorizations.add(
      makeAuthorization({
        id,
        usuarioId: MARIA.id,
        accessPointId: GATE.id,
        criadoPorId: ADMIN.id,
        dataFim: '2026-10-31',
        ...overrides,
      }),
    );
    return id;
  };
  const sut = new ListMyAuthorizationsUseCase(doubles.authorizations, new FakeClock(NOW));
  const idsOf = async (userId: string, input = query()) =>
    (await sut.execute(userId, input)).data.map((item) => item.id);
  return { sut, add, idsOf, ...doubles };
};

describe('ListMyAuthorizations', () => {
  it('deve devolver só as autorizações do usuário informado', async () => {
    const { add, idsOf } = await makeSut();
    const mine = add({ usuarioId: MARIA.id });
    const his = add({ usuarioId: JOAO.id });

    expect(await idsOf(MARIA.id)).toEqual([mine]);
    expect(await idsOf(JOAO.id)).toEqual([his]);
  });

  it('deve ignorar um usuarioId que venha na query', () => {
    const parsed = ListMyAuthorizationsSchema.parse({ usuarioId: JOAO.id, situacao: 'ATIVA' });

    expect(parsed).toEqual({ situacao: 'ATIVA', page: 1, pageSize: 20 });
  });

  it('deve filtrar pela situação efetiva', async () => {
    const { add, idsOf } = await makeSut();
    const active = add();
    const expired = add({ dataFim: '2026-10-19' });
    add({ usuarioId: JOAO.id, dataFim: '2026-10-19' });

    expect(await idsOf(MARIA.id, query({ situacao: 'EXPIRADA' }))).toEqual([expired]);
    expect(await idsOf(MARIA.id, query({ situacao: 'ATIVA' }))).toEqual([active]);
  });

  it('deve ordenar por dataFim crescente e desempatar por id', async () => {
    const { add, idsOf } = await makeSut();
    const late = add({ dataFim: '2026-12-01' });
    const tieB = add({ dataFim: '2026-10-25' });
    const early = add({ dataFim: '2026-10-21' });

    const ids = await idsOf(MARIA.id);

    expect(ids).toEqual([early, tieB, late]);
  });

  it('deve paginar e informar o total', async () => {
    const { sut, add } = await makeSut();
    const ids = [
      add({ dataFim: '2026-10-21' }),
      add({ dataFim: '2026-10-22' }),
      add({ dataFim: '2026-10-23' }),
    ];
    add({ usuarioId: JOAO.id });

    const second = await sut.execute(MARIA.id, query({ page: 2, pageSize: 2 }));

    expect(second).toMatchObject({ page: 2, pageSize: 2, total: 3 });
    expect(second.data.map((item) => item.id)).toEqual([ids[2]]);
  });
});
