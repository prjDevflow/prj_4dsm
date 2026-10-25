import { describe, expect, it } from 'vitest';
import { FakeHashProvider } from '../../../../test/doubles/FakeHashProvider';
import { InMemoryTerminalRepository } from '../../../../test/doubles/InMemoryTerminalRepository';
import { makeTerminal } from '../../../../test/factories/makeTerminal';
import { AuthenticateTerminalUseCase } from './AuthenticateTerminal_UseCase';

const KEY = 'chave-do-terminal';

const makeSut = async (overrides: Parameters<typeof makeTerminal>[0] = {}) => {
  const terminals = new InMemoryTerminalRepository();
  const hash = new FakeHashProvider();
  const terminal = makeTerminal({ apiKeyHash: hash.sha256(KEY), ...overrides });
  await terminals.save(terminal);
  const sut = new AuthenticateTerminalUseCase(terminals, hash);
  return { sut, terminals, hash, terminal };
};

describe('AuthenticateTerminal', () => {
  it('deve autenticar com a chave certa e devolver o terminal e o ponto de acesso', async () => {
    const { sut, terminal } = await makeSut();

    const result = await sut.execute({ terminalId: terminal.id, key: KEY });

    expect(result).toEqual({ terminalId: terminal.id, accessPointId: terminal.accessPointId });
  });

  it('deve recusar a chave errada com 401 UNAUTHORIZED', async () => {
    const { sut, terminal } = await makeSut();

    const error = await sut
      .execute({ terminalId: terminal.id, key: 'outra-chave' })
      .catch((e) => e);

    expect(error).toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
  });

  it('deve recusar cabeçalho ausente com 401, seja o id ou a chave', async () => {
    const { sut, terminal } = await makeSut();

    const noKey = await sut.execute({ terminalId: terminal.id, key: undefined }).catch((e) => e);
    const noId = await sut.execute({ terminalId: undefined, key: KEY }).catch((e) => e);

    expect(noKey).toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
    expect(noId).toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
  });

  it('deve recusar com a mesma resposta o id inexistente, o id malformado e a chave errada', async () => {
    const { sut, terminal } = await makeSut();

    const wrongKey = await sut.execute({ terminalId: terminal.id, key: 'x' }).catch((e) => e);
    const unknownId = await sut
      .execute({ terminalId: '00000000-0000-4000-8000-0000000000ff', key: KEY })
      .catch((e) => e);
    const malformedId = await sut.execute({ terminalId: 'nao-e-id', key: KEY }).catch((e) => e);

    for (const error of [unknownId, malformedId]) {
      expect(error).toMatchObject({ code: wrongKey.code, status: 401, message: wrongKey.message });
    }
  });

  it('deve recusar o terminal inativo com 403 FORBIDDEN quando a chave está certa', async () => {
    const { sut, terminal } = await makeSut({ ativo: false });

    const error = await sut.execute({ terminalId: terminal.id, key: KEY }).catch((e) => e);

    expect(error).toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('deve dar 401 ao terminal inativo com chave errada, sem revelar que ele existe', async () => {
    const { sut, terminal } = await makeSut({ ativo: false });

    const error = await sut.execute({ terminalId: terminal.id, key: 'errada' }).catch((e) => e);

    expect(error).toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
  });
});
