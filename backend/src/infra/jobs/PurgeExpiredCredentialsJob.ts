import type { ILogger } from '../../providers/ILogger';

export class PurgeExpiredCredentialsJob {
  constructor(
    private purge: () => Promise<number>,
    private logger: ILogger,
    private intervalMs: number,
  ) {}

  start() {
    void this.purge;
    void this.logger;
    void this.intervalMs;
  }

  stop() {}
}
