import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { makeLocationDoubles } from '../../../../test/doubles/InMemoryLocationUnitOfWork';
import { makeAccessPoint } from '../../../../test/factories/makeAccessPoint';
import { makeAuthorization } from '../../../../test/factories/makeAuthorization';
import { makeBuilding } from '../../../../test/factories/makeBuilding';
import { makeUser } from '../../../../test/factories/makeUser';
import { CancelAuthorizationUseCase } from './CancelAuthorization_UseCase';

const idOf = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ADMIN = makeUser({ id: idOf(1), nome: 'Admin', perfil: 'ADMIN' });
const OTHER_ADMIN = makeUser({ id: idOf(3), nome: 'Outro Admin', perfil: 'ADMIN' });
const VISITOR = makeUser({ id: idOf(2), nome: 'Maria Souza' });
const BUILDING = makeBuilding({ id: idOf(10), nome: 'Edifício Central' });
const POINT = makeAccessPoint({ id: idOf(20), buildingId: BUILDING.id, nome: 'Catraca Social' });
const AUTHORIZATION_ID = idOf(30);

// 2026-10-20 11:00 in São Paulo
const NOW = new Date('2026-10-20T14:00:00Z');

const makeSut = async (overrides: Parameters<typeof makeAuthorization>[0] = {}) => {
  const doubles = makeLocationDoubles();
  const clock = new FakeClock(NOW);
  for (const user of [ADMIN, OTHER_ADMIN, VISITOR]) await doubles.users.save(user);
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
      ...overrides,
    }),
  );
  const sut = new CancelAuthorizationUseCase(doubles.authorizations, clock);
  return { sut, clock, ...doubles };
};

describe('CancelAuthorization', () => {
  it('deve gravar CANCELADA, quem cancelou, quando (relógio injetado) e o motivo', async () => {
    const { sut, authorizations } = await makeSut();

    await sut.execute(AUTHORIZATION_ID, { motivo: 'Pedido da moradora' }, ADMIN.id);

    expect(authorizations.all()).toEqual([
      expect.objectContaining({
        id: AUTHORIZATION_ID,
        situacao: 'CANCELADA',
        canceladoPorId: ADMIN.id,
        canceladoEm: NOW,
        motivoCancelamento: 'Pedido da moradora',
      }),
    ]);
  });

  it('deve gravar motivo nulo quando o corpo não traz motivo', async () => {
    const { sut, authorizations } = await makeSut();

    await sut.execute(AUTHORIZATION_ID, {}, ADMIN.id);

    expect(authorizations.all()[0]).toMatchObject({
      situacao: 'CANCELADA',
      motivoCancelamento: null,
    });
  });

  it('deve devolver situacaoEfetiva CANCELADA e quem cancelou na resposta', async () => {
    const { sut } = await makeSut();

    const view = await sut.execute(AUTHORIZATION_ID, { motivo: 'Pedido' }, OTHER_ADMIN.id);

    expect(view).toMatchObject({
      situacao: 'CANCELADA',
      situacaoEfetiva: 'CANCELADA',
      canceladoPor: { id: OTHER_ADMIN.id, nome: 'Outro Admin' },
      canceladoEm: NOW,
      motivoCancelamento: 'Pedido',
    });
  });

  it('deve devolver o estado atual e manter quem, quando e o motivo ao cancelar de novo', async () => {
    const { sut, clock, authorizations } = await makeSut();
    await sut.execute(AUTHORIZATION_ID, { motivo: 'Primeiro' }, ADMIN.id);
    clock.advance(60 * 60 * 1000);

    const again = await sut.execute(AUTHORIZATION_ID, { motivo: 'Segundo' }, OTHER_ADMIN.id);

    expect(again).toMatchObject({
      situacaoEfetiva: 'CANCELADA',
      canceladoPor: { id: ADMIN.id },
      canceladoEm: NOW,
      motivoCancelamento: 'Primeiro',
    });
    expect(authorizations.all()[0]).toMatchObject({ canceladoPorId: ADMIN.id, canceladoEm: NOW });
  });

  it('deve lançar NotFoundError quando a autorização não existe', async () => {
    const { sut } = await makeSut();

    const error = await sut.execute(idOf(99), {}, ADMIN.id).catch((e) => e);

    expect(error).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('deve cancelar a autorização expirada ou esgotada que ainda está gravada como ATIVA', async () => {
    const expired = await makeSut({ dataInicio: '2026-10-10', dataFim: '2026-10-19' });
    const spent = await makeSut({ usosRealizados: 3, usosPermitidos: 3 });

    const fromExpired = await expired.sut.execute(AUTHORIZATION_ID, {}, ADMIN.id);
    const fromSpent = await spent.sut.execute(AUTHORIZATION_ID, {}, ADMIN.id);

    expect(fromExpired).toMatchObject({ situacao: 'CANCELADA', situacaoEfetiva: 'CANCELADA' });
    expect(fromSpent).toMatchObject({ situacao: 'CANCELADA', situacaoEfetiva: 'CANCELADA' });
  });
});
