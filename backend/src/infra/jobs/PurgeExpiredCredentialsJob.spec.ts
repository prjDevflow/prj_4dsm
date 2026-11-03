import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SpyLogger } from '../../../test/doubles/SpyLogger';
import { PurgeExpiredCredentialsJob } from './PurgeExpiredCredentialsJob';

const MINUTE = 60_000;

const makeSut = (purge: () => Promise<number>) => {
  const logger = new SpyLogger();
  const job = new PurgeExpiredCredentialsJob(purge, logger, MINUTE);
  return { job, logger };
};

describe('PurgeExpiredCredentialsJob', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve rodar a limpeza a cada minuto depois de iniciado, e não antes', async () => {
    const purge = vi.fn(async () => 0);
    const { job } = makeSut(purge);

    job.start();
    await vi.advanceTimersByTimeAsync(MINUTE - 1);
    expect(purge).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(purge).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2 * MINUTE);
    expect(purge).toHaveBeenCalledTimes(3);
    job.stop();
  });

  it('deve registrar no log quantas credenciais apagou, só quando apagou alguma', async () => {
    const results = [0, 4];
    const { job, logger } = makeSut(async () => results.shift() ?? 0);

    job.start();
    await vi.advanceTimersByTimeAsync(MINUTE);
    expect(logger.entries).toEqual([]);
    await vi.advanceTimersByTimeAsync(MINUTE);

    expect(logger.of('info')).toEqual([
      expect.objectContaining({ meta: expect.objectContaining({ apagadas: 4 }) }),
    ]);
    job.stop();
  });

  it('deve registrar o erro com contexto e continuar rodando no minuto seguinte', async () => {
    const purge = vi
      .fn<() => Promise<number>>()
      .mockRejectedValueOnce(new Error('banco fora do ar'))
      .mockResolvedValue(0);
    const { job, logger } = makeSut(purge);

    job.start();
    await vi.advanceTimersByTimeAsync(MINUTE);
    expect(logger.of('error')).toHaveLength(1);
    expect(logger.of('error')[0]?.meta).toMatchObject({ erro: 'banco fora do ar' });
    await vi.advanceTimersByTimeAsync(MINUTE);

    expect(purge).toHaveBeenCalledTimes(2);
    job.stop();
  });

  it('deve pular o minuto quando a limpeza anterior ainda não terminou', async () => {
    let finish: (value: number) => void = () => undefined;
    const purge = vi.fn(() => new Promise<number>((resolve) => (finish = resolve)));
    const { job } = makeSut(purge);

    job.start();
    await vi.advanceTimersByTimeAsync(3 * MINUTE);
    expect(purge).toHaveBeenCalledTimes(1);
    finish(0);
    await vi.advanceTimersByTimeAsync(MINUTE);

    expect(purge).toHaveBeenCalledTimes(2);
    job.stop();
  });

  it('deve parar de rodar depois de stop e não iniciar duas vezes', async () => {
    const purge = vi.fn(async () => 0);
    const { job } = makeSut(purge);

    job.start();
    job.start();
    await vi.advanceTimersByTimeAsync(MINUTE);
    expect(purge).toHaveBeenCalledTimes(1);
    job.stop();
    await vi.advanceTimersByTimeAsync(5 * MINUTE);

    expect(purge).toHaveBeenCalledTimes(1);
  });
});
