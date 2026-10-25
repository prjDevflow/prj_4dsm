import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { InMemoryTerminalRepository } from '../../../../test/doubles/InMemoryTerminalRepository';
import { makeTerminal } from '../../../../test/factories/makeTerminal';
import { GetTerminalUseCase } from './GetTerminal_UseCase';

const makeSut = async () => {
  const terminals = new InMemoryTerminalRepository();
  const clock = new FakeClock();
  const terminal = makeTerminal({ ultimoContatoEm: new Date(clock.now().getTime() - 5_000) });
  await terminals.save(terminal);
  const sut = new GetTerminalUseCase(terminals, clock, { onlineWindowSeconds: 30 });
  return { sut, terminal };
};

describe('GetTerminal', () => {
  it('deve devolver o terminal com o estado online, sem o hash da chave', async () => {
    const { sut, terminal } = await makeSut();

    const view = await sut.execute(terminal.id);

    expect(view).toMatchObject({ id: terminal.id, nome: terminal.nome, online: true });
    expect(view).not.toHaveProperty('apiKeyHash');
  });

  it('deve lançar NotFoundError quando o terminal não existe', async () => {
    const { sut } = await makeSut();

    const error = await sut.execute('00000000-0000-4000-8000-0000000000ff').catch((e) => e);

    expect(error).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });
});
