import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaAccessPointRepository } from '../../src/infra/repositories/PrismaAccessPointRepository';
import { PrismaAuthorizationRepository } from '../../src/infra/repositories/PrismaAuthorizationRepository';
import { PrismaLocationUnitOfWork } from '../../src/infra/repositories/PrismaLocationUnitOfWork';
import {
  insertAccessPoint,
  insertAuthorization,
  insertBuilding,
  prisma,
  resetDatabase,
} from './helpers';

const TODAY = '2026-10-20';
const authorizations = new PrismaAuthorizationRepository(prisma);
const accessPoints = new PrismaAccessPointRepository(prisma);
const uow = new PrismaLocationUnitOfWork(prisma);

describe('PrismaAuthorizationRepository (B07)', () => {
  beforeEach(resetDatabase);

  describe('hasActiveNonExpiredForAccessPoint', () => {
    it('é verdadeiro para autorização ATIVA que vence hoje ou depois, e falso para vencida ontem', async () => {
      const today = await insertAccessPoint();
      const future = await insertAccessPoint({ buildingId: today.buildingId });
      const yesterday = await insertAccessPoint({ buildingId: today.buildingId });
      await insertAuthorization({ accessPointId: today.id, dataFim: new Date('2026-10-20') });
      await insertAuthorization({ accessPointId: future.id, dataFim: new Date('2099-01-01') });
      await insertAuthorization({ accessPointId: yesterday.id, dataFim: new Date('2026-10-19') });

      expect(await authorizations.hasActiveNonExpiredForAccessPoint(today.id, TODAY)).toBe(true);
      expect(await authorizations.hasActiveNonExpiredForAccessPoint(future.id, TODAY)).toBe(true);
      expect(await authorizations.hasActiveNonExpiredForAccessPoint(yesterday.id, TODAY)).toBe(
        false,
      );
    });

    it('é falso para autorização cancelada e para autorização de outro ponto', async () => {
      const point = await insertAccessPoint();
      const other = await insertAccessPoint({ buildingId: point.buildingId });
      await insertAuthorization({
        accessPointId: point.id,
        dataFim: new Date('2099-01-01'),
        situacao: 'CANCELADA',
      });
      await insertAuthorization({ accessPointId: other.id, dataFim: new Date('2099-01-01') });

      expect(await authorizations.hasActiveNonExpiredForAccessPoint(point.id, TODAY)).toBe(false);
    });

    it('ignora os usos: autorização esgotada e dentro do prazo ainda conta como ativa', async () => {
      const point = await insertAccessPoint();
      await insertAuthorization({
        accessPointId: point.id,
        dataFim: new Date('2099-01-01'),
        usosPermitidos: 2,
        usosRealizados: 2,
      });

      expect(await authorizations.hasActiveNonExpiredForAccessPoint(point.id, TODAY)).toBe(true);
    });
  });

  describe('hasActiveNonExpiredForBuilding', () => {
    it('olha todos os pontos do edifício e só os dele', async () => {
      const building = await insertBuilding();
      const other = await insertBuilding({ nome: 'Outro' });
      const point = await insertAccessPoint({ buildingId: building.id });
      const otherPoint = await insertAccessPoint({ buildingId: other.id });
      await insertAuthorization({ accessPointId: point.id, dataFim: new Date('2099-01-01') });

      expect(await authorizations.hasActiveNonExpiredForBuilding(building.id, TODAY)).toBe(true);
      expect(await authorizations.hasActiveNonExpiredForBuilding(other.id, TODAY)).toBe(false);
      expect(otherPoint.buildingId).toBe(other.id);
    });

    it('é falso quando as autorizações do edifício estão vencidas ou canceladas', async () => {
      const building = await insertBuilding();
      const point = await insertAccessPoint({ buildingId: building.id });
      await insertAuthorization({ accessPointId: point.id, dataFim: new Date('2026-10-19') });
      await insertAuthorization({
        accessPointId: point.id,
        dataFim: new Date('2099-01-01'),
        situacao: 'CANCELADA',
      });

      expect(await authorizations.hasActiveNonExpiredForBuilding(building.id, TODAY)).toBe(false);
    });
  });
});

describe('PrismaLocationUnitOfWork', () => {
  beforeEach(resetDatabase);

  it('é tudo ou nada: se o trabalho falha depois de desativar os pontos, os pontos continuam ativos', async () => {
    const building = await insertBuilding();
    const point = await insertAccessPoint({ buildingId: building.id });

    await expect(
      uow.run(async ({ buildings, accessPoints }) => {
        await buildings.findByIdForUpdate(building.id);
        await accessPoints.lockByBuilding(building.id);
        await accessPoints.deactivateByBuilding(building.id);
        throw new Error('falha no meio do trabalho');
      }),
    ).rejects.toThrow('falha no meio do trabalho');

    expect((await prisma.accessPoint.findUniqueOrThrow({ where: { id: point.id } })).ativo).toBe(
      true,
    );
  });

  it('confirma as escritas quando o trabalho termina, e devolve o que o trabalho devolveu', async () => {
    const building = await insertBuilding();
    const other = await insertBuilding({ nome: 'Outro' });
    const point = await insertAccessPoint({ buildingId: building.id });
    const otherPoint = await insertAccessPoint({ buildingId: other.id });

    const found = await uow.run(async ({ buildings, accessPoints }) => {
      const locked = await buildings.findByIdForUpdate(building.id);
      await accessPoints.lockByBuilding(building.id);
      await accessPoints.deactivateByBuilding(building.id);
      return locked;
    });

    expect(found).toMatchObject({ id: building.id, ativo: true });
    expect((await accessPoints.findById(point.id))?.ativo).toBe(false);
    expect((await accessPoints.findById(otherPoint.id))?.ativo).toBe(true);
  });

  it('as travas devolvem os dados e valem para registro inexistente (null)', async () => {
    const building = await insertBuilding();
    const point = await insertAccessPoint({ buildingId: building.id });
    const missing = '5eed0000-0000-4000-8000-0000000000ff';

    const result = await uow.run(async (repos) => ({
      building: await repos.buildings.findByIdForShare(building.id),
      point: await repos.accessPoints.findByIdForUpdate(point.id),
      noBuilding: await repos.buildings.findByIdForUpdate(missing),
      noPoint: await repos.accessPoints.findByIdForUpdate(missing),
    }));

    expect(result.building).toMatchObject({ id: building.id });
    expect(result.point).toMatchObject({ id: point.id });
    expect(result.noBuilding).toBeNull();
    expect(result.noPoint).toBeNull();
  });
});
