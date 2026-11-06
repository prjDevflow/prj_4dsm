import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { FakeHashProvider } from '../../../../test/doubles/FakeHashProvider';
import { InMemoryTerminalRepository } from '../../../../test/doubles/InMemoryTerminalRepository';
import { makeTerminal } from '../../../../test/factories/makeTerminal';
import { AuthenticateTerminalUseCase } from '../AuthenticateTerminal/AuthenticateTerminal_UseCase';
import { UpdateTerminalUseCase } from './UpdateTerminal_UseCase';

const makeSut = async () => {
  const terminals = new InMemoryTerminalRepository();
  const hash = new FakeHashProvider();
  const terminal = makeTerminal({ apiKeyHash: hash.sha256('chave') });
  await terminals.save(terminal);
  const sut = new UpdateTerminalUseCase(terminals, new FakeClock(), { onlineWindowSeconds: 30 });
  const authenticate = new AuthenticateTerminalUseCase(terminals, hash);
  return { sut, authenticate, terminals, terminal };
};

describe('UpdateTerminal', () => {
  it('deve alterar o nome e devolver o terminal sem o hash da chave', async () => {
    const { sut, terminals, terminal } = await makeSut();

    const view = await sut.execute(terminal.id, { nome: 'Terminal Novo' });

    expect(view).toMatchObject({ id: terminal.id, nome: 'Terminal Novo', ativo: true });
    expect(view).not.toHaveProperty('apiKeyHash');
    expect((await terminals.findById(terminal.id))?.nome).toBe('Terminal Novo');
  });

  it('deve desativar e reativar sem apagar nada e sem mexer na chave', async () => {
    const { sut, authenticate, terminal } = await makeSut();

    await sut.execute(terminal.id, { ativo: false });
    const whileInactive = await authenticate
      .execute({ terminalId: terminal.id, key: 'chave' })
      .catch((e) => e);
    await sut.execute(terminal.id, { ativo: true });

    expect(whileInactive).toMatchObject({ code: 'FORBIDDEN', status: 403 });
    expect(await authenticate.execute({ terminalId: terminal.id, key: 'chave' })).toMatchObject({
      terminalId: terminal.id,
    });
  });

  it('deve manter os campos que não vieram no pedido', async () => {
    const { sut, terminal } = await makeSut();

    const view = await sut.execute(terminal.id, { ativo: false });

    expect(view).toMatchObject({ nome: terminal.nome, accessPointId: terminal.accessPointId });
  });

  it('deve lançar NotFoundError quando o terminal não existe', async () => {
    const { sut } = await makeSut();

    const error = await sut
      .execute('00000000-0000-4000-8000-0000000000ff', { nome: 'X' })
      .catch((e) => e);

    expect(error).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });
});
