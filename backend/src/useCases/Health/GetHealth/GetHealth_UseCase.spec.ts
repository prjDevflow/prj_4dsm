import { describe, it, expect } from 'vitest';
import { GetHealthUseCase } from './GetHealth_UseCase';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { FakeDatabaseProbe } from '../../../../test/doubles/FakeDatabaseProbe';

const makeSut = (database: 'up' | 'down' | 'throws' = 'up') => {
  const clock = new FakeClock(new Date('2026-10-16T12:34:56.000Z'));
  const probe = new FakeDatabaseProbe(database);
  const sut = new GetHealthUseCase(clock, probe, { version: '9.9.9' });
  return { sut, clock, probe };
};

describe('GetHealth', () => {
  it('deve devolver status ok, a versão configurada e a hora do relógio injetado', async () => {
    const { sut } = makeSut();

    const result = await sut.execute();

    expect(result).toEqual({
      status: 'ok',
      version: '9.9.9',
      time: '2026-10-16T12:34:56.000Z',
      db: 'up',
    });
  });

  it('deve refletir o avanço do relógio na hora devolvida', async () => {
    const { sut, clock } = makeSut();
    clock.advance(10_000);

    const result = await sut.execute();

    expect(result.time).toBe('2026-10-16T12:35:06.000Z');
  });

  it('deve devolver db up quando o banco responde', async () => {
    const { sut } = makeSut('up');

    const result = await sut.execute();

    expect(result.db).toBe('down');
  });

  it('deve devolver db down quando o banco não responde', async () => {
    const { sut } = makeSut('down');

    const result = await sut.execute();

    expect(result.db).toBe('down');
  });

  it('deve devolver db down, sem lançar exceção, quando o teste de conexão falha com erro', async () => {
    const { sut } = makeSut('throws');

    const result = await sut.execute();

    expect(result).toMatchObject({ status: 'ok', db: 'down' });
  });
});
