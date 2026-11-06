import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { InMemoryTerminalRepository } from '../../../../test/doubles/InMemoryTerminalRepository';
import { makeTerminal } from '../../../../test/factories/makeTerminal';
import { ListTerminalsUseCase } from './ListTerminals_UseCase';

const makeSut = () => {
  const terminals = new InMemoryTerminalRepository();
  const clock = new FakeClock();
  const sut = new ListTerminalsUseCase(terminals, clock, { onlineWindowSeconds: 30 });
  return { sut, terminals, clock };
};

const secondsAgo = (clock: FakeClock, s: number) => new Date(clock.now().getTime() - s * 1000);
const idOf = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const page = { page: 1, pageSize: 20 };

describe('ListTerminals', () => {
  it('deve indicar online 29 s após o contato e offline 31 s após, pelo relógio injetado', async () => {
    const { sut, terminals, clock } = makeSut();
    await terminals.save(
      makeTerminal({
        id: idOf(1),
        accessPointId: idOf(11),
        nome: 'A',
        ultimoContatoEm: secondsAgo(clock, 29),
      }),
    );
    await terminals.save(
      makeTerminal({
        id: idOf(2),
        accessPointId: idOf(12),
        nome: 'B',
        ultimoContatoEm: secondsAgo(clock, 31),
      }),
    );

    const result = await sut.execute(page);

    expect(result.data.map((t) => [t.nome, t.online])).toEqual([
      ['A', true],
      ['B', false],
    ]);
  });

  it('deve mudar de offline para online quando o relógio anda e o contato fica velho', async () => {
    const { sut, terminals, clock } = makeSut();
    await terminals.save(makeTerminal({ ultimoContatoEm: secondsAgo(clock, 10) }));

    expect((await sut.execute(page)).data[0]?.online).toBe(true);
    clock.advance(25_000);

    expect((await sut.execute(page)).data[0]?.online).toBe(false);
  });

  it('deve indicar offline o terminal que nunca fez contato', async () => {
    const { sut, terminals } = makeSut();
    await terminals.save(makeTerminal({ ultimoContatoEm: null }));

    expect((await sut.execute(page)).data[0]).toMatchObject({
      online: false,
      ultimoContatoEm: null,
    });
  });

  it('nunca deve expor o hash da chave', async () => {
    const { sut, terminals } = makeSut();
    await terminals.save(makeTerminal());

    const [terminal] = (await sut.execute(page)).data;

    expect(terminal).not.toHaveProperty('apiKeyHash');
    expect(JSON.stringify(terminal)).not.toContain('chave-de-teste');
  });

  it('deve devolver a página pedida, ordenada por nome, com o total', async () => {
    const { sut, terminals } = makeSut();
    for (const [n, nome] of [
      [1, 'Carlos'],
      [2, 'Ana'],
      [3, 'Bruno'],
    ] as const) {
      await terminals.save(makeTerminal({ id: idOf(n), accessPointId: idOf(n + 10), nome }));
    }

    const result = await sut.execute({ page: 2, pageSize: 2 });

    expect(result).toMatchObject({ page: 2, pageSize: 2, total: 3 });
    expect(result.data.map((t) => t.nome)).toEqual(['Carlos']);
  });
});
