import { describe, expect, it } from 'vitest';
import { InMemoryAccessPointRepository } from '../../../../test/doubles/InMemoryAccessPointRepository';
import { InMemoryBuildingRepository } from '../../../../test/doubles/InMemoryBuildingRepository';
import { makeBuilding } from '../../../../test/factories/makeBuilding';
import { ListBuildingsUseCase } from './ListBuildings_UseCase';

const idOf = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const makeSut = async () => {
  const buildings = new InMemoryBuildingRepository(new InMemoryAccessPointRepository());
  await buildings.save(makeBuilding({ id: idOf(1), nome: 'Carlos', ativo: true }));
  await buildings.save(makeBuilding({ id: idOf(2), nome: 'Ana', ativo: false }));
  await buildings.save(makeBuilding({ id: idOf(3), nome: 'Bruno', ativo: true }));
  return { sut: new ListBuildingsUseCase(buildings) };
};

describe('ListBuildings', () => {
  it('deve listar todos ordenados por nome, com o formato paginado', async () => {
    const { sut } = await makeSut();

    const result = await sut.execute({ page: 1, pageSize: 20 });

    expect(result).toMatchObject({ page: 1, pageSize: 20, total: 3 });
    expect(result.data.map((b) => b.nome)).toEqual(['Ana', 'Bruno', 'Carlos']);
  });

  it('deve filtrar por ativo, verdadeiro e falso', async () => {
    const { sut } = await makeSut();

    const active = await sut.execute({ ativo: true, page: 1, pageSize: 20 });
    const inactive = await sut.execute({ ativo: false, page: 1, pageSize: 20 });

    expect(active.data.map((b) => b.nome)).toEqual(['Bruno', 'Carlos']);
    expect(inactive.data.map((b) => b.nome)).toEqual(['Ana']);
  });

  it('deve paginar e informar o total antes da paginação', async () => {
    const { sut } = await makeSut();

    const result = await sut.execute({ page: 2, pageSize: 2 });

    expect(result.total).toBe(3);
    expect(result.data.map((b) => b.nome)).toEqual(['Carlos']);
  });
});
