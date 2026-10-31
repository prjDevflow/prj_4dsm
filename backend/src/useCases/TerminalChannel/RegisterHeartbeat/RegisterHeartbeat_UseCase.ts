import type { IClock } from '../../../providers/IClock';
import type { ITerminalRepository } from '../../../repositories/ITerminalRepository';
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
    await this.terminals.updateHeartbeat(
      terminalId,
      {
        contatoEm: now,
        gpsFix: input.gpsFix,
        gpsSimulado: input.gpsSimulado,
        firmware: input.firmware,
        rssi: input.wifiRssi ?? null,
        posicao: { latitude: input.latitude as number, longitude: input.longitude as number },
      },
      new Date(now.getTime() - this.config.minIntervalSeconds * 1000),
    );
    return { serverTime: '', config: { qrRefreshMs: 0, commandPollMs: 0, aberturaMs: 0 } };
  }
}
