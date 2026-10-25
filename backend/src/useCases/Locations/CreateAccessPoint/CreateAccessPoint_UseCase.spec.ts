import { describe, expect, it } from 'vitest';
import { InMemoryAccessPointRepository } from '../../../../test/doubles/InMemoryAccessPointRepository';
import { InMemoryBuildingRepository } from '../../../../test/doubles/InMemoryBuildingRepository';
import { SequentialIdGenerator } from '../../../../test/doubles/SequentialIdGenerator';
import { makeBuilding } from '../../../../test/factories/makeBuilding';
import { CreateAccessPointUseCase } from './CreateAccessPoint_UseCase';

const CENTRAL = makeBuilding({ id: '00000000-0000-4000-8000-0000000000b1' });
const ANEXO = makeBuilding({ id: '00000000-0000-4000-8000-0000000000b2', nome: 'Anexo' });
const CLOSED = makeBuilding({
  id: '00000000-0000-4000-8000-0000000000b3',
  nome: 'Fechado',
  ativo: false,
});

const makeSut = async () => {
  const accessPoints = new InMemoryAccessPointRepository();
  const buildings = new InMemoryBuildingRepository(accessPoints);
  for (const building of [CENTRAL, ANEXO, CLOSED]) await buildings.save(building);
  const sut = new CreateAccessPointUseCase(buildings, accessPoints, new SequentialIdGenerator());
  return { sut, accessPoints };
};

const input = {
  buildingId: CENTRAL.id,
  tipo: 'CATRACA' as const,
  nome: 'Catraca Social',
  identificacao: 'CAT-01',
  latitude: -23.30512,
  longitude: -45.96551,
};

describe('CreateAccessPoint', () => {
  it('deve gravar os campos com o id do gerador e ativo verdadeiro', async () => {
    const { sut, accessPoints } = await makeSut();

    const created = await sut.execute(input);

    expect(created).toEqual({ id: '00000000-0000-4000-8000-000000000001', ...input, ativo: true });
    expect(await accessPoints.findById(created.id)).toEqual(created);
  });

  it('deve lançar NotFoundError quando o edifício não existe', async () => {
    const { sut } = await makeSut();

    const error = await sut
      .execute({ ...input, buildingId: '00000000-0000-4000-8000-0000000000ff' })
      .catch((e) => e);

    expect(error).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('deve rejeitar edifício inativo com erro de validação no campo buildingId', async () => {
    const { sut } = await makeSut();

    const error = await sut.execute({ ...input, buildingId: CLOSED.id }).catch((e) => e);

    expect(error).toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
      details: [{ field: 'buildingId', message: expect.any(String) }],
    });
  });

  it('deve rejeitar identificação repetida no mesmo edifício com 409 CONFLICT', async () => {
    const { sut } = await makeSut();
    await sut.execute(input);

    const error = await sut.execute({ ...input, nome: 'Outra' }).catch((e) => e);

    expect(error).toMatchObject({ code: 'CONFLICT', status: 409 });
  });

  it('deve aceitar a mesma identificação em outro edifício', async () => {
    const { sut } = await makeSut();
    await sut.execute(input);

    const other = await sut.execute({ ...input, buildingId: ANEXO.id });

    expect(other.identificacao).toBe('CAT-01');
  });
});
