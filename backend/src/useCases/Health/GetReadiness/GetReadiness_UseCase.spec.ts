import { describe, it, expect } from 'vitest';
import { GetReadinessUseCase } from './GetReadiness_UseCase';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { FakeDatabaseProbe } from '../../../../test/doubles/FakeDatabaseProbe';

const makeSut = (database: 'up' | 'down' | 'throws' = 'up') => {
  const clock = new FakeClock(new Date('2026-11-08T12:00:00.000Z'));
  const sut = new GetReadinessUseCase(clock, new FakeDatabaseProbe(database));
  return { sut, clock };
};

describe('GetReadiness', () => {
  it('deve devolver pronto, db up e a hora do relógio injetado quando o banco responde', async () => {
    const { sut } = makeSut('up');

    const result = await sut.execute();

    expect(result).toEqual({ status: 'ready', db: 'up', time: '2026-11-08T12:00:00.000Z' });
  });

  it('deve devolver indisponível e db down quando o banco não responde', async () => {
    const { sut } = makeSut('down');

    const result = await sut.execute();

    expect(result).toEqual({ status: 'unavailable', db: 'down', time: '2026-11-08T12:00:00.000Z' });
  });

  it('deve devolver indisponível, sem lançar exceção, quando o teste de conexão falha com erro', async () => {
    const { sut } = makeSut('throws');

    const result = await sut.execute();

    expect(result).toMatchObject({ status: 'unavailable', db: 'down' });
  });
});
