import { describe, it, expect } from 'vitest';
import { GetHealthUseCase } from './GetHealth_UseCase';
import { FakeClock } from '../../../../test/doubles/FakeClock';

const makeSut = () => {
  const clock = new FakeClock(new Date('2026-10-16T12:34:56.000Z'));
  const sut = new GetHealthUseCase(clock, { version: '9.9.9' });
  return { sut, clock };
};

describe('GetHealth', () => {
  it('deve devolver status ok, a versão configurada e a hora do relógio injetado', () => {
    const { sut } = makeSut();

    const result = sut.execute();

    expect(result).toEqual({ status: 'ok', version: '9.9.9', time: '2026-10-16T12:34:56.000Z' });
  });

  it('deve refletir o avanço do relógio na hora devolvida', () => {
    const { sut, clock } = makeSut();
    clock.advance(10_000);

    const result = sut.execute();

    expect(result.time).toBe('2026-10-16T12:35:06.000Z');
  });
});
