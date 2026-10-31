import { container as c } from '../../../main/container';
import { RegisterHeartbeatController } from './RegisterHeartbeat_Controller';
import { RegisterHeartbeatUseCase } from './RegisterHeartbeat_UseCase';

const useCase = new RegisterHeartbeatUseCase(c.terminals, c.clock, {
  minIntervalSeconds: c.env.HEARTBEAT_MIN_INTERVAL_S,
  qrRefreshMs: c.env.QR_REFRESH_MS,
  commandPollMs: c.env.COMMAND_POLL_MS,
  aberturaMs: c.env.OPEN_DURATION_MS,
});
export const registerHeartbeatController = new RegisterHeartbeatController(useCase);
