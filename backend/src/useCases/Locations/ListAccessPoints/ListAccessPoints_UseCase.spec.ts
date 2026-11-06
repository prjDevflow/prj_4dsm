import { describe, expect, it } from 'vitest';
import { InMemoryAccessPointRepository } from '../../../../test/doubles/InMemoryAccessPointRepository';
import { makeAccessPoint } from '../../../../test/factories/makeAccessPoint';
import { ListAccessPointsUseCase } from './ListAccessPoints_UseCase';

const idOf = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const CENTRAL = idOf(1);
const ANEXO = idOf(2);
const page = { page: 1, pageSize: 20 };

const makeSut = async () => {
  const accessPoints = new InMemoryAccessPointRepository();
  const points = [
    makeAccessPoint({
      id: idOf(11),
      buildingId: CENTRAL,
      tipo: 'CATRACA',
      nome: 'Catraca Social',
      identificacao: 'CAT-01',
    }),
    makeAccessPoint({
      id: idOf(12),
      buildingId: CENTRAL,
      tipo: 'PORTARIA',
      nome: 'Portaria',
      identificacao: 'POR-01',
    }),
    makeAccessPoint({
      id: idOf(13),
      buildingId: ANEXO,
      tipo: 'CATRACA',
      nome: 'Catraca Anexo',
      identificacao: 'CAT-01',
      ativo: false,
    }),
    makeAccessPoint({
      id: idOf(14),
      buildingId: ANEXO,
      tipo: 'PORTA',
      nome: 'Porta Garagem',
      identificacao: 'POR-02',
    }),
  ];
  for (const point of points) await accessPoints.save(point);
  return { sut: new ListAccessPointsUseCase(accessPoints) };
};

const names = async (sut: ListAccessPointsUseCase, filter: object) =>
  (await sut.execute({ ...page, ...filter })).data.map((p) => p.nome);

describe('ListAccessPoints', () => {
  it('deve listar todos ordenados por nome, com o formato paginado', async () => {
    const { sut } = await makeSut();

    const result = await sut.execute(page);

    expect(result).toMatchObject({ page: 1, pageSize: 20, total: 4 });
    expect(result.data.map((p) => p.nome)).toEqual([
      'Catraca Anexo',
      'Catraca Social',
      'Porta Garagem',
      'Portaria',
    ]);
  });

  it('deve filtrar por buildingId', async () => {
    const { sut } = await makeSut();

    expect(await names(sut, { buildingId: CENTRAL })).toEqual(['Catraca Social', 'Portaria']);
  });

  it('deve filtrar por tipo', async () => {
    const { sut } = await makeSut();

    expect(await names(sut, { tipo: 'CATRACA' })).toEqual(['Catraca Anexo', 'Catraca Social']);
  });

  it('deve filtrar por ativo', async () => {
    const { sut } = await makeSut();

    expect(await names(sut, { ativo: false })).toEqual(['Catraca Anexo']);
    expect(await names(sut, { ativo: true })).toHaveLength(3);
  });

  it('deve combinar os filtros', async () => {
    const { sut } = await makeSut();

    expect(await names(sut, { buildingId: ANEXO, tipo: 'CATRACA', ativo: true })).toEqual([]);
    expect(await names(sut, { buildingId: ANEXO, tipo: 'CATRACA', ativo: false })).toEqual([
      'Catraca Anexo',
    ]);
  });

  it('deve paginar e informar o total antes da paginação', async () => {
    const { sut } = await makeSut();

    const result = await sut.execute({ page: 2, pageSize: 3 });

    expect(result.total).toBe(4);
    expect(result.data.map((p) => p.nome)).toEqual(['Portaria']);
  });
});
