import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { InMemoryTerminalCommandRepository } from '../../../../test/doubles/InMemoryTerminalCommandRepository';
import { makeNewTerminalCommand } from '../../../../test/factories/makeTerminalCommand';
import { PurgeExpiredCommandsUseCase } from './PurgeExpiredCommands_UseCase';

const HOUR = 3_600_000;

const makeSut = (purgeAfterHours = 1) => {
  const commands = new InMemoryTerminalCommandRepository();
  const clock = new FakeClock();
  const sut = new PurgeExpiredCommandsUseCase(commands, clock, { purgeAfterHours });
  /** Stores a command that expired `msAgo` before the clock's now (negative: still valid). */
  const expiredAgo = (msAgo: number) =>
    commands.create(
      makeNewTerminalCommand({
        criadoEm: new Date(clock.now().getTime() - msAgo - 10_000),
        expiraEm: new Date(clock.now().getTime() - msAgo),
      }),
    );
  return { sut, commands, clock, expiredAgo };
};

describe('PurgeExpiredCommands', () => {
  it('deve apagar o comando vencido há mais de 1 hora', async () => {
    const { sut, commands, expiredAgo } = makeSut();
    await expiredAgo(HOUR + 1);

    await sut.execute();

    expect(commands.all()).toHaveLength(0);
  });

  it('deve manter o comando vencido há exatamente 1 hora', async () => {
    const { sut, commands, expiredAgo } = makeSut();
    await expiredAgo(HOUR);

    await sut.execute();

    expect(commands.all()).toHaveLength(1);
  });

  it('deve manter o comando recém vencido e o ainda válido', async () => {
    const { sut, commands, expiredAgo } = makeSut();
    await expiredAgo(1);
    await expiredAgo(-5_000);

    await sut.execute();

    expect(commands.all()).toHaveLength(2);
  });

  it('deve apagar só os vencidos há mais de 1 hora entre vários', async () => {
    const { sut, commands, expiredAgo } = makeSut();
    await expiredAgo(3 * HOUR);
    await expiredAgo(HOUR + 1);
    const atLimit = await expiredAgo(HOUR);
    const recent = await expiredAgo(60_000);

    await sut.execute();

    expect(commands.all().map((command) => command.id)).toEqual([atLimit.id, recent.id]);
  });

  it('deve apagar também o comando vencido que já foi entregue e executado', async () => {
    const { sut, commands, clock, expiredAgo } = makeSut();
    const old = await expiredAgo(2 * HOUR);
    await commands.markDelivered([old.id], clock.now());
    await commands.markExecuted(old.terminalId, old.id, clock.now());

    await sut.execute();

    expect(commands.all()).toHaveLength(0);
  });

  it('deve devolver quantos comandos apagou', async () => {
    const { sut, expiredAgo } = makeSut();
    await expiredAgo(2 * HOUR);
    await expiredAgo(2 * HOUR);
    await expiredAgo(10);

    expect(await sut.execute()).toBe(2);
  });

  it('deve usar o prazo configurado e o relógio injetado', async () => {
    const { sut, commands, clock, expiredAgo } = makeSut(3);
    await expiredAgo(2 * HOUR);
    await expiredAgo(3 * HOUR + 1);

    await sut.execute();
    expect(commands.all()).toHaveLength(1);

    clock.advance(HOUR + 1);
    await sut.execute();
    expect(commands.all()).toHaveLength(0);
  });
});
