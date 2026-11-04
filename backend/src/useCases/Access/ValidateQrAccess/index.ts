import { container as c } from '../../../main/container';
import { accessEventRecorder } from '../../Events';
import { ValidateQrAccessController } from './ValidateQrAccess_Controller';
import { ValidateQrAccessUseCase } from './ValidateQrAccess_UseCase';

const useCase = new ValidateQrAccessUseCase(
  c.qrCredentials,
  c.terminals,
  c.accessPoints,
  c.users,
  c.authorizations,
  c.accessGrants,
  c.terminalCommands,
  accessEventRecorder,
  c.hash,
  c.ids,
  c.clock,
  c.logger,
  {
    maxDistanceM: c.env.MAX_DISTANCE_M,
    positionSource: c.env.TERMINAL_POSITION_SOURCE,
    gpsMaxAgeMinutes: c.env.GPS_MAX_AGE_MIN,
    commandTtlSeconds: c.env.COMMAND_TTL_SECONDS,
    aberturaMs: c.env.OPEN_DURATION_MS,
  },
);
export const validateQrAccessController = new ValidateQrAccessController(useCase);
