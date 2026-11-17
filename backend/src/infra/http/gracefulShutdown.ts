import type { ILogger } from '../../providers/ILogger';

/** The part of `http.Server` the shutdown needs; a fake implements it in the tests. */
export interface ClosableServer {
  close(callback: (error?: Error) => void): unknown;
}

export interface GracefulShutdownDeps {
  server: ClosableServer;
  /** Stops the background jobs (timers) before the server closes. */
  stopJobs: (() => void)[];
  /** Closes the database pool, after the last request ended. */
  disconnect: () => Promise<void>;
  logger: ILogger;
  exit: (code: number) => void;
  /** After this, the process exits with 1 even if connections are still open. */
  timeoutMs: number;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Returns the handler for SIGTERM/SIGINT. The host (Azure Container Apps) sends SIGTERM when it replaces
 * a revision; without a handler, Node as PID 1 ignores it and is killed only after the grace period.
 */
export function createGracefulShutdown(deps: GracefulShutdownDeps) {
  let shuttingDown: Promise<void> | null = null;
  let exited = false;

  const exitOnce = (code: number) => {
    if (exited) return;
    exited = true;
    deps.exit(code);
  };

  const run = async (signal: string) => {
    deps.logger.info('Desligando o servidor', { sinal: signal });

    const timer = setTimeout(() => {
      deps.logger.error('Desligamento passou do prazo; saindo à força', { prazoMs: deps.timeoutMs });
      exitOnce(1);
    }, deps.timeoutMs);
    // The timer alone must not keep the process alive.
    timer.unref?.();

    for (const stop of deps.stopJobs) stop();

    let code = 0;
    try {
      await new Promise<void>((resolve, reject) => {
        deps.server.close((error) => (error ? reject(error) : resolve()));
      });
    } catch (error) {
      code = 1;
      deps.logger.error('Falha ao fechar o servidor HTTP', { erro: message(error) });
    }

    try {
      await deps.disconnect();
    } catch (error) {
      code = 1;
      deps.logger.error('Falha ao desconectar o banco', { erro: message(error) });
    }

    clearTimeout(timer);
    exitOnce(code);
  };

  return (signal: string): Promise<void> => {
    shuttingDown ??= run(signal);
    return shuttingDown;
  };
}
