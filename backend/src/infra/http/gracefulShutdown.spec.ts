import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SpyLogger } from '../../../test/doubles/SpyLogger';
import { createGracefulShutdown, type ClosableServer } from './gracefulShutdown';

const TIMEOUT_MS = 10_000;

class FakeServer implements ClosableServer {
  closeCalls = 0;
  private pending: ((error?: Error) => void) | null = null;

  close(callback: (error?: Error) => void) {
    this.closeCalls += 1;
    this.pending = callback;
    return this;
  }

  /** Simulates the last open connection ending. */
  finish(error?: Error) {
    this.pending?.(error);
  }
}

const makeSut = () => {
  const order: string[] = [];
  const server = new FakeServer();
  const logger = new SpyLogger();
  const exit = vi.fn((code: number) => {
    order.push(`exit:${code}`);
  });
  const disconnect = vi.fn(async () => {
    order.push('disconnect');
  });
  const stopJobA = vi.fn(() => order.push('stopJobA'));
  const stopJobB = vi.fn(() => order.push('stopJobB'));
  const shutdown = createGracefulShutdown({
    server,
    stopJobs: [stopJobA, stopJobB],
    disconnect,
    logger,
    exit,
    timeoutMs: TIMEOUT_MS,
  });
  return { shutdown, server, logger, exit, disconnect, stopJobA, stopJobB, order };
};

describe('createGracefulShutdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve parar os jobs, fechar o servidor, desconectar o banco e sair com código 0, nessa ordem', async () => {
    const { shutdown, server, order, logger } = makeSut();

    const done = shutdown('SIGTERM');
    expect(server.closeCalls).toBe(1);
    server.finish();
    await done;

    expect(order).toEqual(['stopJobA', 'stopJobB', 'disconnect', 'exit:0']);
    expect(logger.of('info').map((entry) => entry.message)).toContain('Desligando o servidor');
    expect(logger.of('info')[0]?.meta).toEqual({ sinal: 'SIGTERM' });
  });

  it('não deve desconectar o banco antes de o servidor terminar as requisições em andamento', async () => {
    const { shutdown, server, disconnect, exit } = makeSut();

    const done = shutdown('SIGTERM');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(disconnect).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();

    server.finish();
    await done;
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('deve ignorar um segundo sinal enquanto já está desligando', async () => {
    const { shutdown, server, exit, stopJobA } = makeSut();

    const first = shutdown('SIGTERM');
    const second = shutdown('SIGINT');
    server.finish();
    await Promise.all([first, second]);

    expect(server.closeCalls).toBe(1);
    expect(stopJobA).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledOnce();
  });

  it('deve sair com código 1 e registrar o erro se fechar o servidor falhar', async () => {
    const { shutdown, server, exit, logger, disconnect } = makeSut();

    const done = shutdown('SIGTERM');
    server.finish(new Error('servidor já fechado'));
    await done;

    expect(disconnect).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(1);
    expect(logger.of('error')[0]?.meta).toEqual({ erro: 'servidor já fechado' });
  });

  it('deve sair com código 1 se desconectar o banco falhar', async () => {
    const { shutdown, server, exit, disconnect, logger } = makeSut();
    disconnect.mockRejectedValueOnce(new Error('conexão perdida'));

    const done = shutdown('SIGTERM');
    server.finish();
    await done;

    expect(exit).toHaveBeenCalledWith(1);
    expect(logger.of('error')[0]?.meta).toEqual({ erro: 'conexão perdida' });
  });

  it('deve forçar a saída com código 1 quando o servidor não fecha dentro do prazo', async () => {
    const { shutdown, exit, logger } = makeSut();

    void shutdown('SIGTERM');
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS - 1);
    expect(exit).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(exit).toHaveBeenCalledWith(1);
    expect(logger.of('error').map((entry) => entry.message)).toContain(
      'Desligamento passou do prazo; saindo à força',
    );
  });

  it('não deve sair duas vezes quando o servidor fecha depois de a saída forçada já ter acontecido', async () => {
    const { shutdown, server, exit } = makeSut();

    const done = shutdown('SIGTERM');
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);
    server.finish();
    await done;

    expect(exit).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(1);
  });
});
