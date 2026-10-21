import { env } from '../config/env';
import { appVersion } from '../config/version';
import { createPrismaClient } from '../infra/database/prisma';
import { PrismaUserRepository } from '../infra/repositories/PrismaUserRepository';
import { BcryptHashProvider } from '../infra/providers/BcryptHashProvider';
import { JwtTokenProvider } from '../infra/providers/JwtTokenProvider';
import { PrismaDatabaseProbe } from '../infra/providers/PrismaDatabaseProbe';
import { createPino, PinoLogger } from '../infra/providers/PinoLogger';
import { SystemClock } from '../infra/providers/SystemClock';
import type { IClock } from '../providers/IClock';
import type { IDatabaseProbe } from '../providers/IDatabaseProbe';
import type { IHashProvider } from '../providers/IHashProvider';
import type { ILogger } from '../providers/ILogger';
import type { ITokenProvider } from '../providers/ITokenProvider';
import type { IUserRepository } from '../repositories/IUserRepository';

const pino = createPino(env.LOG_LEVEL);
const logger = new PinoLogger(pino) as ILogger;
const prisma = createPrismaClient(env.DATABASE_URL, logger);
const clock = new SystemClock() as IClock;

export const container = {
  env,
  appVersion,
  pino,
  prisma,
  logger,
  clock,
  databaseProbe: new PrismaDatabaseProbe(prisma) as IDatabaseProbe,
  hash: new BcryptHashProvider(env.BCRYPT_COST) as IHashProvider,
  tokens: new JwtTokenProvider(env.JWT_SECRET, env.JWT_EXPIRES_IN, clock) as ITokenProvider,
  users: new PrismaUserRepository(prisma) as IUserRepository,
};
