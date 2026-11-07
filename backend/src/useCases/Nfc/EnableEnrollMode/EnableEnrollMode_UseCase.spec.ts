import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { InMemoryTerminalRepository } from '../../../../test/doubles/InMemoryTerminalRepository';
import { InMemoryUserRepository } from '../../../../test/doubles/InMemoryUserRepository';
import { makeTerminal } from '../../../../test/factories/makeTerminal';
import { makeUser } from '../../../../test/factories/makeUser';
import { EnableEnrollModeUseCase } from './EnableEnrollMode_UseCase';

const makeSut = async (config = { enrollModeSeconds: 60 }) => {
  const terminals = new InMemoryTerminalRepository();
  const users = new InMemoryUserRepository();
  const clock = new FakeClock();
  const terminal = makeTerminal();
  const user = makeUser();
  await terminals.save(terminal);
  await users.save(user);
  const sut = new EnableEnrollModeUseCase(terminals, users, clock, config);
  return { sut, terminals, users, clock, terminal, user };
};

describe('EnableEnrollMode', () => {
  it('deve gravar o usuário e o prazo de agora mais 60 s e devolvê-los', async () => {
    const { sut, terminals, clock, terminal, user } = await makeSut();
    const expectedUntil = new Date(clock.now().getTime() + 60_000);

    const result = await sut.execute(terminal.id, { usuarioId: user.id });

    expect(result).toEqual({
      terminalId: terminal.id,
      usuarioId: user.id,
      expiraEm: expectedUntil,
    });
    expect(await terminals.findById(terminal.id)).toMatchObject({
      modoCadastroUsuarioId: user.id,
      modoCadastroAte: expectedUntil,
    });
  });

  it.todo('deve usar o prazo configurado em ENROLL_MODE_SECONDS');
  it.todo('deve deixar o modo expirar sozinho: vigente em T+59 s e T+60 s, vencido em T+61 s');
  it.todo('deve rejeitar terminal inexistente com 404');
  it.todo('deve rejeitar usuário inexistente com 404 e não gravar');
  it.todo('deve rejeitar usuário inativo com 422 no campo usuarioId e não gravar');
  it.todo('deve dar o 404 do terminal antes de olhar o usuário');
  it.todo('deve substituir o modo anterior quando é ativado de novo');
  it.todo('deve mudar só as duas colunas do modo de cadastro');
  it.todo('deve aceitar terminal inativo, que nem consegue ler tag');
});
