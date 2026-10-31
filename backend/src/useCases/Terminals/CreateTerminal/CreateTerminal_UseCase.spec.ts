import { describe, expect, it } from 'vitest';
import { FakeHashProvider } from '../../../../test/doubles/FakeHashProvider';
import { FixedRandom } from '../../../../test/doubles/FixedRandom';
import { InMemoryAccessPointRepository } from '../../../../test/doubles/InMemoryAccessPointRepository';
import { InMemoryTerminalRepository } from '../../../../test/doubles/InMemoryTerminalRepository';
import { SequentialIdGenerator } from '../../../../test/doubles/SequentialIdGenerator';
import { makeAccessPoint } from '../../../../test/factories/makeAccessPoint';
import { CreateTerminalUseCase } from './CreateTerminal_UseCase';

const makeSut = async () => {
  const terminals = new InMemoryTerminalRepository();
  const accessPoints = new InMemoryAccessPointRepository();
  const hash = new FakeHashProvider();
  const random = new FixedRandom();
  const ids = new SequentialIdGenerator();
  const point = makeAccessPoint();
  await accessPoints.save(point);
  const sut = new CreateTerminalUseCase(terminals, accessPoints, hash, random, ids);
  return { sut, terminals, accessPoints, hash, random, ids, point };
};

describe('CreateTerminal', () => {
  it('deve devolver a apiKey uma vez e persistir só o hash dela', async () => {
    const { sut, terminals, hash, point } = await makeSut();

    const created = await sut.execute({ accessPointId: point.id, nome: 'Terminal Social' });

    expect(created).toEqual({ id: expect.any(String), apiKey: 'key-1' });
    const saved = await terminals.findById(created.id);
    expect(saved?.apiKeyHash).toBe(hash.sha256('key-1'));
    expect(JSON.stringify(saved)).not.toContain('"key-1"');
  });

  it('deve pedir 32 bytes aleatórios para a chave', async () => {
    const { sut, random, point } = await makeSut();

    await sut.execute({ accessPointId: point.id, nome: 'Terminal Social' });

    expect(random.lastBytes).toBe(32);
  });

  it('deve gravar o terminal ativo, sem contato, ligado ao ponto de acesso', async () => {
    const { sut, terminals, point } = await makeSut();

    const created = await sut.execute({ accessPointId: point.id, nome: 'Terminal Social' });

    expect(await terminals.findById(created.id)).toMatchObject({
      accessPointId: point.id,
      nome: 'Terminal Social',
      ativo: true,
      ultimoContatoEm: null,
    });
  });

  it('deve rejeitar o segundo terminal no mesmo ponto com 409 CONFLICT', async () => {
    const { sut, point } = await makeSut();
    await sut.execute({ accessPointId: point.id, nome: 'Primeiro' });

    const error = await sut.execute({ accessPointId: point.id, nome: 'Segundo' }).catch((e) => e);

    expect(error).toMatchObject({ code: 'CONFLICT', status: 409 });
  });

  it('deve rejeitar ponto de acesso inexistente com NotFoundError', async () => {
    const { sut } = await makeSut();

    const error = await sut
      .execute({ accessPointId: '00000000-0000-4000-8000-0000000000ff', nome: 'Terminal' })
      .catch((e) => e);

    expect(error).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('deve rejeitar ponto de acesso inativo com erro de validação no campo accessPointId', async () => {
    const { sut, accessPoints } = await makeSut();
    const inactive = makeAccessPoint({
      id: '00000000-0000-4000-8000-0000000000c2',
      identificacao: 'CAT-02',
      ativo: false,
    });
    await accessPoints.save(inactive);

    const error = await sut
      .execute({ accessPointId: inactive.id, nome: 'Terminal' })
      .catch((e) => e);

    expect(error).toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
      details: [{ field: 'accessPointId', message: expect.any(String) }],
    });
  });

  it('não deve gravar nada quando a criação é rejeitada', async () => {
    const { sut, terminals, point } = await makeSut();
    await sut.execute({ accessPointId: point.id, nome: 'Primeiro' });

    await sut.execute({ accessPointId: point.id, nome: 'Segundo' }).catch(() => undefined);

    expect((await terminals.list({ page: 1, pageSize: 10 })).total).toBe(1);
  });
});
