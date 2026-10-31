import type { IClock } from '../../../providers/IClock';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
import { RateLimitedError } from '../../../shared/errors/AppError';
import type { IRegisterHeartbeatDTO } from './RegisterHeartbeat_DTO';

export interface RegisterHeartbeatConfig {
  /** `HEARTBEAT_MIN_INTERVAL_S`. */
  minIntervalSeconds: number;
  /** `QR_REFRESH_MS`. */
  qrRefreshMs: number;
  /** `COMMAND_POLL_MS`. */
  commandPollMs: number;
  /** `OPEN_DURATION_MS`. */
  aberturaMs: number;
}

export interface RegisterHeartbeatResult {
  /** UTC, to the second. */
  serverTime: string;
  config: { qrRefreshMs: number; commandPollMs: number; aberturaMs: number };
}

export class RegisterHeartbeatUseCase {
  constructor(
    private terminals: ITerminalRepository,
    private clock: IClock,
    private config: RegisterHeartbeatConfig,
  ) {}

  async execute(
    terminalId: string,
    input: IRegisterHeartbeatDTO,
  ): Promise<RegisterHeartbeatResult> {
    const now = this.clock.now();
    const { minIntervalSeconds, qrRefreshMs, commandPollMs, aberturaMs } = this.config;
    // Latitude and longitude only count with a fix; the DTO already guarantees both come together.
    const posicao =
      input.gpsFix && input.latitude != null && input.longitude != null
        ? { latitude: input.latitude, longitude: input.longitude }
        : null;

    const stored = await this.terminals.updateHeartbeat(
      terminalId,
      {
        contatoEm: now,
        gpsFix: input.gpsFix,
        gpsSimulado: input.gpsSimulado,
        firmware: input.firmware,
        rssi: input.wifiRssi ?? null,
        posicao,
      },
      new Date(now.getTime() - minIntervalSeconds * 1000),
    );
    if (!stored) {
      throw new RateLimitedError('Heartbeat muito frequente. Aguarde alguns segundos');
    }

    return {
      // The contract shows the time to the second, which is easier to parse on the terminal.
      serverTime: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
      config: { qrRefreshMs, commandPollMs, aberturaMs },
    };
  }
}
