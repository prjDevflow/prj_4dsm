import { env } from '../config/env';
import { appVersion } from '../config/version';
import { createPrismaClient } from '../infra/database/prisma';
import { PrismaDatabaseProbe } from '../infra/providers/PrismaDatabaseProbe';
import { createPino, PinoLogger } from '../infra/providers/PinoLogger';
import { SystemClock } from '../infra/providers/SystemClock';
import type { IClock } from '../providers/IClock';
import type { IDatabaseProbe } from '../providers/IDatabaseProbe';
import type { ILogger } from '../providers/ILogger';

const pino = createPino(env.LOG_LEVEL);
const logger = new PinoLogger(pino) as ILogger;
const prisma = createPrismaClient(env.DATABASE_URL, logger);

export const container = {
  env,
  appVersion,
  pino,
  prisma,
  logger,
  clock: new SystemClock() as IClock,
  databaseProbe: new PrismaDatabaseProbe(prisma) as IDatabaseProbe,
};
