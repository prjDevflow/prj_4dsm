import { describe, expect, it } from 'vitest';
import { FakeHashProvider } from '../../../../test/doubles/FakeHashProvider';
import { FixedRandom } from '../../../../test/doubles/FixedRandom';
import { InMemoryTerminalRepository } from '../../../../test/doubles/InMemoryTerminalRepository';
import { makeTerminal } from '../../../../test/factories/makeTerminal';
import { AuthenticateTerminalUseCase } from '../AuthenticateTerminal/AuthenticateTerminal_UseCase';
import { RotateTerminalKeyUseCase } from './RotateTerminalKey_UseCase';

const makeSut = async () => {
  const terminals = new InMemoryTerminalRepository();
  const hash = new FakeHashProvider();
  const random = new FixedRandom();
  const terminal = makeTerminal({ apiKeyHash: hash.sha256('chave-antiga') });
  await terminals.save(terminal);
  const sut = new RotateTerminalKeyUseCase(terminals, hash, random);
  const authenticate = new AuthenticateTerminalUseCase(terminals, hash);
  return { sut, authenticate, terminals, hash, random, terminal };
};

describe('RotateTerminalKey', () => {
  it('deve invalidar a chave antiga na hora e autenticar com a nova', async () => {
    const { sut, authenticate, terminal } = await makeSut();

    const rotated = await sut.execute(terminal.id);

    const old = await authenticate
      .execute({ terminalId: terminal.id, key: 'chave-antiga' })
      .catch((e) => e);
    expect(old).toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    expect(await authenticate.execute({ terminalId: terminal.id, key: rotated.apiKey })).toEqual({
      terminalId: terminal.id,
      accessPointId: terminal.accessPointId,
    });
  });

  it('deve devolver id e apiKey e guardar só o hash da chave nova', async () => {
    const { sut, terminals, hash, terminal } = await makeSut();

    const rotated = await sut.execute(terminal.id);

    expect(rotated).toEqual({ id: terminal.id, apiKey: 'key-1' });
    expect((await terminals.findById(terminal.id))?.apiKeyHash).toBe(hash.sha256('key-1'));
  });

  it('deve pedir 32 bytes aleatórios e gerar uma chave diferente a cada rotação', async () => {
    const { sut, random, terminal } = await makeSut();

    const first = await sut.execute(terminal.id);
    const second = await sut.execute(terminal.id);

    expect(random.lastBytes).toBe(32);
    expect(second.apiKey).not.toBe(first.apiKey);
  });

  it('deve manter os demais campos do terminal', async () => {
    const { sut, terminals, terminal } = await makeSut();

    await sut.execute(terminal.id);

    expect(await terminals.findById(terminal.id)).toMatchObject({
      nome: terminal.nome,
      ativo: true,
      accessPointId: terminal.accessPointId,
    });
  });

  it('deve lançar NotFoundError quando o terminal não existe', async () => {
    const { sut } = await makeSut();

    const error = await sut.execute('00000000-0000-4000-8000-0000000000ff').catch((e) => e);

    expect(error).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });
});
