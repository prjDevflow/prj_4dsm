import type { ILogger } from '../../providers/ILogger';

export interface PurgeJobMessages {
  /** Logged (info) when a run deleted something. */
  apagou: string;
  /** Logged (error) when a run failed. */
  falhou: string;
}

/** Runs `purge` on a fixed interval. It never throws: a failed run is logged and the next one still happens. */
export class PurgeJob {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private purge: () => Promise<number>,
    private logger: ILogger,
    private intervalMs: number,
    private messages: PurgeJobMessages,
  ) {}

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    // The job alone must not keep the process alive (a clean shutdown or a test run can end).
    this.timer.unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick() {
    // A slow run is not started again on top of itself.
    if (this.running) return;
    this.running = true;
    try {
      const apagadas = await this.purge();
      if (apagadas > 0) this.logger.info(this.messages.apagou, { apagadas });
    } catch (error) {
      this.logger.error(this.messages.falhou, {
        erro: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.running = false;
    }
  }
}
