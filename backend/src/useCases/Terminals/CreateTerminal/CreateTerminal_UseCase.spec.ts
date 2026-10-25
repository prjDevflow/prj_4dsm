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

  it.todo('deve pedir 32 bytes aleatórios para a chave');
  it.todo('deve gravar o terminal ativo, sem contato, ligado ao ponto de acesso');
  it.todo('deve rejeitar o segundo terminal no mesmo ponto com 409 CONFLICT');
  it.todo('deve rejeitar ponto de acesso inexistente com NotFoundError');
  it.todo('deve rejeitar ponto de acesso inativo com erro de validação no campo accessPointId');
});
