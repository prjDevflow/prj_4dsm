import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaAccessPointRepository } from '../../src/infra/repositories/PrismaAccessPointRepository';
import { PrismaAuthorizationRepository } from '../../src/infra/repositories/PrismaAuthorizationRepository';
import { PrismaBuildingRepository } from '../../src/infra/repositories/PrismaBuildingRepository';
import {
  insertAccessPoint,
  insertAuthorization,
  insertBuilding,
  prisma,
  resetDatabase,
} from './helpers';

const TODAY = '2026-10-20';
const authorizations = new PrismaAuthorizationRepository(prisma);
const buildings = new PrismaBuildingRepository(prisma);
const accessPoints = new PrismaAccessPointRepository(prisma);

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

describe('PrismaBuildingRepository.saveAndDeactivateAccessPoints', () => {
  beforeEach(resetDatabase);

  it('é tudo ou nada: se gravar o edifício falha, os pontos continuam ativos', async () => {
    const building = await insertBuilding();
    const point = await insertAccessPoint({ buildingId: building.id });

    // 200 characters do not fit the 120-character column, so the building write fails.
    const broken = { ...building, nome: 'x'.repeat(200), ativo: false };
    await expect(buildings.saveAndDeactivateAccessPoints(broken)).rejects.toThrow();

    expect((await prisma.accessPoint.findUniqueOrThrow({ where: { id: point.id } })).ativo).toBe(
      true,
    );
    expect((await prisma.building.findUniqueOrThrow({ where: { id: building.id } })).ativo).toBe(
      true,
    );
  });

  it('grava o edifício inativo e desativa só os pontos dele', async () => {
    const building = await insertBuilding();
    const other = await insertBuilding({ nome: 'Outro' });
    const point = await insertAccessPoint({ buildingId: building.id });
    const otherPoint = await insertAccessPoint({ buildingId: other.id });

    await buildings.saveAndDeactivateAccessPoints({ ...building, ativo: false });

    expect((await buildings.findById(building.id))?.ativo).toBe(false);
    expect((await accessPoints.findById(point.id))?.ativo).toBe(false);
    expect((await accessPoints.findById(otherPoint.id))?.ativo).toBe(true);
  });
});
