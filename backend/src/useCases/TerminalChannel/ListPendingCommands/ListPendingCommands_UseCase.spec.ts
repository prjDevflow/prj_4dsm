import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { InMemoryTerminalCommandRepository } from '../../../../test/doubles/InMemoryTerminalCommandRepository';
import { makeNewTerminalCommand } from '../../../../test/factories/makeTerminalCommand';
import { ListPendingCommandsUseCase } from './ListPendingCommands_UseCase';

const TERMINAL = '00000000-0000-4000-8000-0000000000a9';

const makeSut = () => {
  const commands = new InMemoryTerminalCommandRepository();
  const clock = new FakeClock(new Date('2026-10-20T14:00:00Z'));
  const sut = new ListPendingCommandsUseCase(commands, clock);
  return { sut, commands, clock };
};

const ids = (list: { id: number }[]) => list.map((command) => command.id);

describe('ListPendingCommands', () => {
  it('deve devolver os comandos do terminal em ordem crescente de id', async () => {
    const { sut, commands } = makeSut();
    await commands.create(makeNewTerminalCommand());
    await commands.create(makeNewTerminalCommand({ tipo: 'NEGAR', motivo: 'USOS_ESGOTADOS' }));
    await commands.create(makeNewTerminalCommand());

    const result = await sut.execute(TERMINAL, { after: 0, limit: 10 });

    expect(ids(result)).toEqual([1, 2, 3]);
  });

  it.todo('deve entregar o comando com 10 s de vida e não entregar com mais de 10 s');
  it.todo('deve devolver só os comandos com id maior que after');
  it.todo('deve respeitar o limit');
  it.todo('deve nunca devolver comandos de outro terminal');
  it.todo('deve marcar entregueEm na primeira entrega e preservar nas seguintes');
  it.todo('deve não marcar como entregue o comando vencido nem o que ficou fora do limit');
});
