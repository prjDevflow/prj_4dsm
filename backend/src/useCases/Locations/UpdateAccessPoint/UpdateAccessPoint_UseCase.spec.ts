import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { makeLocationDoubles } from '../../../../test/doubles/InMemoryLocationUnitOfWork';
import { makeAccessPoint } from '../../../../test/factories/makeAccessPoint';
import { makeAuthorization } from '../../../../test/factories/makeAuthorization';
import { makeBuilding } from '../../../../test/factories/makeBuilding';
import { UpdateAccessPointUseCase } from './UpdateAccessPoint_UseCase';

const idOf = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const CENTRAL = makeBuilding({ id: idOf(1), nome: 'Central' });
const CLOSED = makeBuilding({ id: idOf(2), nome: 'Fechado', ativo: false });
const POINT = makeAccessPoint({ id: idOf(11), buildingId: CENTRAL.id, identificacao: 'CAT-01' });
const SIBLING = makeAccessPoint({ id: idOf(12), buildingId: CENTRAL.id, identificacao: 'POR-01' });
const IN_CLOSED = makeAccessPoint({
  id: idOf(13),
  buildingId: CLOSED.id,
  identificacao: 'CAT-09',
  ativo: false,
});

const makeSut = async () => {
  const { uow, buildings, accessPoints, authorizations, locks } = makeLocationDoubles();
  const clock = new FakeClock(); // 2026-10-20 11:00 in São Paulo
  for (const building of [CENTRAL, CLOSED]) await buildings.save(building);
  for (const point of [POINT, SIBLING, IN_CLOSED]) await accessPoints.save(point);
  const sut = new UpdateAccessPointUseCase(uow, clock);
  return { sut, accessPoints, authorizations, clock, locks };
};

describe('UpdateAccessPoint', () => {
  it('deve alterar só os campos enviados e manter o resto', async () => {
    const { sut, accessPoints } = await makeSut();

    const updated = await sut.execute(POINT.id, { nome: 'Catraca Nova', tipo: 'PORTA' });

    expect(updated).toEqual({ ...POINT, nome: 'Catraca Nova', tipo: 'PORTA' });
    expect(await accessPoints.findById(POINT.id)).toEqual(updated);
  });

  it('deve lançar NotFoundError quando o ponto de acesso não existe', async () => {
    const { sut } = await makeSut();

    const error = await sut.execute(idOf(99), { nome: 'X' }).catch((e) => e);

    expect(error).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('deve rejeitar identificação de outro ponto do edifício com 409 CONFLICT, mas aceitar a própria', async () => {
    const { sut } = await makeSut();

    const error = await sut.execute(POINT.id, { identificacao: 'POR-01' }).catch((e) => e);
    const same = await sut.execute(POINT.id, { identificacao: 'CAT-01', nome: 'Renomeada' });

    expect(error).toMatchObject({ code: 'CONFLICT', status: 409 });
    expect(same.nome).toBe('Renomeada');
  });

  it('deve recusar a desativação com autorização ativa e vigente: 409 LOCAL_COM_AUTORIZACOES_ATIVAS', async () => {
    const { sut, accessPoints, authorizations } = await makeSut();
    authorizations.add(makeAuthorization({ accessPointId: POINT.id, dataFim: '2026-10-31' }));

    const error = await sut.execute(POINT.id, { ativo: false }).catch((e) => e);

    expect(error).toMatchObject({ code: 'LOCAL_COM_AUTORIZACOES_ATIVAS', status: 409 });
    expect((await accessPoints.findById(POINT.id))?.ativo).toBe(true);
  });

  it('deve bloquear a autorização que vence hoje em São Paulo, mesmo já sendo amanhã em UTC', async () => {
    const { sut, authorizations, clock } = await makeSut();
    clock.set(new Date('2026-10-21T02:30:00Z')); // 23:30 of 2026-10-20 in São Paulo
    authorizations.add(makeAuthorization({ accessPointId: POINT.id, dataFim: '2026-10-20' }));

    const error = await sut.execute(POINT.id, { ativo: false }).catch((e) => e);

    expect(error).toMatchObject({ code: 'LOCAL_COM_AUTORIZACOES_ATIVAS' });
  });

  it('deve permitir desativar com autorização expirada, cancelada ou de outro ponto', async () => {
    const { sut, accessPoints, authorizations } = await makeSut();
    authorizations.add(makeAuthorization({ accessPointId: POINT.id, dataFim: '2026-10-19' }));
    authorizations.add(makeAuthorization({ accessPointId: POINT.id, situacao: 'CANCELADA' }));
    authorizations.add(makeAuthorization({ accessPointId: SIBLING.id, dataFim: '2026-12-31' }));

    await sut.execute(POINT.id, { ativo: false });

    expect((await accessPoints.findById(POINT.id))?.ativo).toBe(false);
  });

  it('deve rejeitar a reativação de ponto cujo edifício está inativo, no campo ativo', async () => {
    const { sut, accessPoints } = await makeSut();

    const error = await sut.execute(IN_CLOSED.id, { ativo: true }).catch((e) => e);

    expect(error).toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
      details: [{ field: 'ativo', message: expect.any(String) }],
    });
    expect((await accessPoints.findById(IN_CLOSED.id))?.ativo).toBe(false);
  });

  it('deve reativar o ponto quando o edifício está ativo', async () => {
    const { sut, accessPoints } = await makeSut();
    await sut.execute(POINT.id, { ativo: false });

    await sut.execute(POINT.id, { ativo: true });

    expect((await accessPoints.findById(POINT.id))?.ativo).toBe(true);
  });

  it('deve editar ponto de edifício inativo sem reativá-lo', async () => {
    const { sut } = await makeSut();

    const updated = await sut.execute(IN_CLOSED.id, { nome: 'Só o nome' });

    expect(updated).toMatchObject({ nome: 'Só o nome', ativo: false });
  });

  it('deve travar só o ponto ao editar ou desativar', async () => {
    const { sut, locks } = await makeSut();

    await sut.execute(POINT.id, { nome: 'Só o nome' });
    await sut.execute(POINT.id, { ativo: false });

    expect(locks).toEqual([`point:update:${POINT.id}`, `point:update:${POINT.id}`]);
  });

  it('deve travar o edifício antes do ponto ao reativar, na ordem do protocolo de travas', async () => {
    const { sut, locks } = await makeSut();
    await sut.execute(POINT.id, { ativo: false });
    locks.length = 0;

    await sut.execute(POINT.id, { ativo: true });

    expect(locks).toEqual([`building:share:${CENTRAL.id}`, `point:update:${POINT.id}`]);
  });
});
