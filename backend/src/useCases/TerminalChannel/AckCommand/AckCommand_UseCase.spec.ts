import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { InMemoryTerminalCommandRepository } from '../../../../test/doubles/InMemoryTerminalCommandRepository';
import { makeNewTerminalCommand } from '../../../../test/factories/makeTerminalCommand';
import { NotFoundError } from '../../../shared/errors/AppError';
import { AckCommandUseCase } from './AckCommand_UseCase';

const TERMINAL = '00000000-0000-4000-8000-0000000000a9';
const OTHER_TERMINAL = '00000000-0000-4000-8000-0000000000aa';

const makeSut = () => {
  const commands = new InMemoryTerminalCommandRepository();
  const clock = new FakeClock(new Date('2026-10-20T14:00:03Z'));
  const sut = new AckCommandUseCase(commands, clock);
  return { sut, commands, clock };
};

describe('AckCommand', () => {
  it('deve marcar executadoEm com o instante do relógio', async () => {
    const { sut, commands } = makeSut();
    const command = await commands.create(makeNewTerminalCommand());

    await sut.execute(TERMINAL, command.id);

    expect(commands.all()[0]?.executadoEm).toEqual(new Date('2026-10-20T14:00:03Z'));
  });

  it('deve lançar NotFoundError e não alterar nada para comando de outro terminal', async () => {
    const { sut, commands } = makeSut();
    const command = await commands.create(makeNewTerminalCommand({ terminalId: OTHER_TERMINAL }));

    const error = await sut.execute(TERMINAL, command.id).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotFoundError);
    expect(error).toMatchObject({ code: 'NOT_FOUND', status: 404 });
    expect(commands.all()[0]?.executadoEm).toBeNull();
  });

  it('deve lançar NotFoundError para comando que não existe', async () => {
    const { sut } = makeSut();

    const error = await sut.execute(TERMINAL, 999).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotFoundError);
  });

  it('deve preservar o primeiro executadoEm quando o ack se repete', async () => {
    const { sut, commands, clock } = makeSut();
    const command = await commands.create(makeNewTerminalCommand());
    await sut.execute(TERMINAL, command.id);

    clock.advance(5000);
    await sut.execute(TERMINAL, command.id);

    expect(commands.all()[0]?.executadoEm).toEqual(new Date('2026-10-20T14:00:03Z'));
  });
});
