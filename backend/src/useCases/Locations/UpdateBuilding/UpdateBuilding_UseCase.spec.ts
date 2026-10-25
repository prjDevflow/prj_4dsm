import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { InMemoryAccessPointRepository } from '../../../../test/doubles/InMemoryAccessPointRepository';
import { InMemoryAuthorizationRepository } from '../../../../test/doubles/InMemoryAuthorizationRepository';
import { InMemoryBuildingRepository } from '../../../../test/doubles/InMemoryBuildingRepository';
import { makeAccessPoint } from '../../../../test/factories/makeAccessPoint';
import { makeAuthorization } from '../../../../test/factories/makeAuthorization';
import { makeBuilding } from '../../../../test/factories/makeBuilding';
import { UpdateBuildingUseCase } from './UpdateBuilding_UseCase';

const idOf = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const CENTRAL = makeBuilding({ id: idOf(1), nome: 'Central' });
const ANEXO = makeBuilding({ id: idOf(2), nome: 'Anexo' });
const POINT_A = makeAccessPoint({ id: idOf(11), buildingId: CENTRAL.id, identificacao: 'CAT-01' });
const POINT_B = makeAccessPoint({ id: idOf(12), buildingId: CENTRAL.id, identificacao: 'POR-01' });
const POINT_OTHER = makeAccessPoint({
  id: idOf(13),
  buildingId: ANEXO.id,
  identificacao: 'CAT-01',
});

const makeSut = async () => {
  const accessPoints = new InMemoryAccessPointRepository();
  const buildings = new InMemoryBuildingRepository(accessPoints);
  const authorizations = new InMemoryAuthorizationRepository(accessPoints);
  const clock = new FakeClock(); // 2026-10-20 11:00 in São Paulo
  for (const building of [CENTRAL, ANEXO]) await buildings.save(building);
  for (const point of [POINT_A, POINT_B, POINT_OTHER]) await accessPoints.save(point);
  const sut = new UpdateBuildingUseCase(buildings, authorizations, clock);
  return { sut, buildings, accessPoints, authorizations, clock };
};

const activeStates = async (accessPoints: InMemoryAccessPointRepository) =>
  Object.fromEntries(accessPoints.all().map((p) => [p.id, p.ativo]));

describe('UpdateBuilding', () => {
  it('deve alterar só os campos enviados e manter o resto', async () => {
    const { sut, buildings } = await makeSut();

    const updated = await sut.execute(CENTRAL.id, { nome: 'Central Novo', latitude: -10 });

    expect(updated).toEqual({ ...CENTRAL, nome: 'Central Novo', latitude: -10 });
    expect(await buildings.findById(CENTRAL.id)).toEqual(updated);
  });

  it('deve lançar NotFoundError quando o edifício não existe', async () => {
    const { sut } = await makeSut();

    const error = await sut.execute(idOf(99), { nome: 'X' }).catch((e) => e);

    expect(error).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('deve desativar o edifício e todos os pontos dele, sem tocar nos de outro edifício', async () => {
    const { sut, buildings, accessPoints } = await makeSut();

    const updated = await sut.execute(CENTRAL.id, { ativo: false });

    expect(updated.ativo).toBe(false);
    expect((await buildings.findById(CENTRAL.id))?.ativo).toBe(false);
    expect(await activeStates(accessPoints)).toEqual({
      [POINT_A.id]: false,
      [POINT_B.id]: false,
      [POINT_OTHER.id]: true,
    });
  });

  it('deve recusar a desativação com 409 LOCAL_COM_AUTORIZACOES_ATIVAS e não mudar nada', async () => {
    const { sut, buildings, accessPoints, authorizations } = await makeSut();
    authorizations.add(makeAuthorization({ accessPointId: POINT_B.id, dataFim: '2026-10-31' }));

    const error = await sut.execute(CENTRAL.id, { ativo: false, nome: 'Outro' }).catch((e) => e);

    expect(error).toMatchObject({ code: 'LOCAL_COM_AUTORIZACOES_ATIVAS', status: 409 });
    expect(await buildings.findById(CENTRAL.id)).toEqual(CENTRAL);
    expect(await activeStates(accessPoints)).toEqual({
      [POINT_A.id]: true,
      [POINT_B.id]: true,
      [POINT_OTHER.id]: true,
    });
  });

  it('deve bloquear com autorização que vence hoje em São Paulo, mesmo já sendo amanhã em UTC', async () => {
    const { sut, authorizations, clock } = await makeSut();
    clock.set(new Date('2026-10-21T02:30:00Z')); // 23:30 of 2026-10-20 in São Paulo
    authorizations.add(makeAuthorization({ accessPointId: POINT_A.id, dataFim: '2026-10-20' }));

    const error = await sut.execute(CENTRAL.id, { ativo: false }).catch((e) => e);

    expect(error).toMatchObject({ code: 'LOCAL_COM_AUTORIZACOES_ATIVAS' });
  });

  it('deve permitir a desativação quando as autorizações estão expiradas, canceladas ou em outro edifício', async () => {
    const { sut, authorizations, buildings } = await makeSut();
    authorizations.add(makeAuthorization({ accessPointId: POINT_A.id, dataFim: '2026-10-19' }));
    authorizations.add(makeAuthorization({ accessPointId: POINT_B.id, situacao: 'CANCELADA' }));
    authorizations.add(makeAuthorization({ accessPointId: POINT_OTHER.id, dataFim: '2026-12-31' }));

    await sut.execute(CENTRAL.id, { ativo: false });

    expect((await buildings.findById(CENTRAL.id))?.ativo).toBe(false);
  });

  it('deve reativar o edifício sem reativar os pontos dele', async () => {
    const { sut, buildings, accessPoints } = await makeSut();
    await sut.execute(CENTRAL.id, { ativo: false });

    await sut.execute(CENTRAL.id, { ativo: true });

    expect((await buildings.findById(CENTRAL.id))?.ativo).toBe(true);
    expect((await activeStates(accessPoints))[POINT_A.id]).toBe(false);
  });

  it('não deve consultar as autorizações nem mexer nos pontos quando o edifício já está inativo', async () => {
    const { sut, accessPoints, authorizations } = await makeSut();
    await sut.execute(CENTRAL.id, { ativo: false });
    await accessPoints.save({ ...POINT_A, ativo: true });
    authorizations.add(makeAuthorization({ accessPointId: POINT_A.id, dataFim: '2026-10-31' }));

    await sut.execute(CENTRAL.id, { ativo: false, nome: 'Renomeado' });

    expect((await activeStates(accessPoints))[POINT_A.id]).toBe(true);
  });
});
