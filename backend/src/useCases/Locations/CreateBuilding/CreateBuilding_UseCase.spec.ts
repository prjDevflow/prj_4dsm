import { describe, expect, it } from 'vitest';
import { InMemoryBuildingRepository } from '../../../../test/doubles/InMemoryBuildingRepository';
import { SequentialIdGenerator } from '../../../../test/doubles/SequentialIdGenerator';
import { CreateBuildingUseCase } from './CreateBuilding_UseCase';

const makeSut = () => {
  const buildings = new InMemoryBuildingRepository();
  const sut = new CreateBuildingUseCase(buildings, new SequentialIdGenerator());
  return { sut, buildings };
};

const input = {
  nome: 'Edifício Central',
  endereco: 'Rua das Acácias, 120',
  latitude: -23.30512,
  longitude: -45.96551,
};

describe('CreateBuilding', () => {
  it('deve gravar os campos com o id do gerador e ativo verdadeiro', async () => {
    const { sut, buildings } = makeSut();

    const created = await sut.execute(input);

    expect(created).toEqual({ id: '00000000-0000-4000-8000-000000000001', ...input, ativo: true });
    expect(await buildings.findById(created.id)).toEqual(created);
  });

  it('deve respeitar ativo falso quando enviado', async () => {
    const { sut } = makeSut();

    expect((await sut.execute({ ...input, ativo: false })).ativo).toBe(false);
  });
});
