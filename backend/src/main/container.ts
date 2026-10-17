import { env } from '../config/env';
import { appVersion } from '../config/version';
import { createPino, PinoLogger } from '../infra/providers/PinoLogger';
import { SystemClock } from '../infra/providers/SystemClock';
import type { IClock } from '../providers/IClock';
import type { ILogger } from '../providers/ILogger';

const pino = createPino(env.LOG_LEVEL);

export const container = {
  env,
  appVersion,
  pino,
  logger: new PinoLogger(pino) as ILogger,
  clock: new SystemClock() as IClock,
};
