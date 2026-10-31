import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { makeLocationDoubles } from '../../../../test/doubles/InMemoryLocationUnitOfWork';
import { makeAccessPoint } from '../../../../test/factories/makeAccessPoint';
import { makeAuthorization } from '../../../../test/factories/makeAuthorization';
import { makeBuilding } from '../../../../test/factories/makeBuilding';
import { makeUser } from '../../../../test/factories/makeUser';
import { GetAuthorizationUseCase } from './GetAuthorization_UseCase';

const idOf = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = makeUser({ id: idOf(1), nome: 'Admin', perfil: 'ADMIN' });
const VISITOR = makeUser({ id: idOf(2), nome: 'Maria Souza' });
const BUILDING = makeBuilding({ id: idOf(10), nome: 'Edifício Central' });
const POINT = makeAccessPoint({ id: idOf(20), buildingId: BUILDING.id, nome: 'Catraca Social' });
const AUTHORIZATION_ID = idOf(30);

// 2026-10-20 11:00 in São Paulo
const NOW = new Date('2026-10-20T14:00:00Z');

const makeSut = async (overrides: Parameters<typeof makeAuthorization>[0] = {}) => {
  const doubles = makeLocationDoubles();
  for (const user of [ADMIN, VISITOR]) await doubles.users.save(user);
  await doubles.buildings.save(BUILDING);
  await doubles.accessPoints.save(POINT);
  doubles.authorizations.add(
    makeAuthorization({
      id: AUTHORIZATION_ID,
      usuarioId: VISITOR.id,
      accessPointId: POINT.id,
      criadoPorId: ADMIN.id,
      dataInicio: '2026-10-20',
      dataFim: '2026-10-25',
      usosPermitidos: 3,
      ...overrides,
    }),
  );
  const sut = new GetAuthorizationUseCase(doubles.authorizations, new FakeClock(NOW));
  return { sut, ...doubles };
};

describe('GetAuthorization', () => {
  it('deve devolver a autorização com usuário, local, edifício e quem a criou', async () => {
    const { sut } = await makeSut();

    const view = await sut.execute(AUTHORIZATION_ID);

    expect(view).toMatchObject({
      id: AUTHORIZATION_ID,
      usuario: { id: VISITOR.id, nome: 'Maria Souza', perfil: 'VISITANTE' },
      local: {
        id: POINT.id,
        nome: 'Catraca Social',
        tipo: 'CATRACA',
        edificio: { id: BUILDING.id, nome: 'Edifício Central' },
      },
      criadoPor: { id: ADMIN.id, nome: 'Admin' },
      usosPermitidos: 3,
      usosRealizados: 0,
    });
  });

  it('deve calcular usosRestantes a partir dos usos realizados', async () => {
    const { sut } = await makeSut({ usosRealizados: 2 });

    const view = await sut.execute(AUTHORIZATION_ID);

    expect(view).toMatchObject({ usosRealizados: 2, usosRestantes: 1, situacaoEfetiva: 'ATIVA' });
  });

  it('deve indicar ESGOTADA quando todos os usos foram gastos e a data ainda vale', async () => {
    const { sut } = await makeSut({ usosRealizados: 3 });

    const view = await sut.execute(AUTHORIZATION_ID);

    expect(view).toMatchObject({
      situacao: 'ATIVA',
      situacaoEfetiva: 'ESGOTADA',
      usosRestantes: 0,
    });
  });

  it('deve indicar EXPIRADA quando dataFim ficou para trás em São Paulo, mesmo com a situação gravada ATIVA', async () => {
    const { sut } = await makeSut({ dataInicio: '2026-10-10', dataFim: '2026-10-19' });

    const view = await sut.execute(AUTHORIZATION_ID);

    expect(view).toMatchObject({ situacao: 'ATIVA', situacaoEfetiva: 'EXPIRADA' });
  });

  it('deve devolver quem cancelou, quando e o motivo', async () => {
    const { sut } = await makeSut({
      situacao: 'CANCELADA',
      canceladoPorId: ADMIN.id,
      canceladoEm: new Date('2026-10-20T13:00:00Z'),
      motivoCancelamento: 'Pedido da moradora',
    });

    const view = await sut.execute(AUTHORIZATION_ID);

    expect(view).toMatchObject({
      situacao: 'CANCELADA',
      situacaoEfetiva: 'CANCELADA',
      canceladoPor: { id: ADMIN.id, nome: 'Admin' },
      canceladoEm: new Date('2026-10-20T13:00:00Z'),
      motivoCancelamento: 'Pedido da moradora',
    });
  });

  it('deve lançar NotFoundError quando a autorização não existe', async () => {
    const { sut } = await makeSut();

    const error = await sut.execute(idOf(99)).catch((e) => e);

    expect(error).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });
});
