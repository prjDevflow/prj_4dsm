import { env } from '../config/env';
import { appVersion } from '../config/version';
import { createPrismaClient } from '../infra/database/prisma';
import { PrismaAccessPointRepository } from '../infra/repositories/PrismaAccessPointRepository';
import { PrismaAuthorizationRepository } from '../infra/repositories/PrismaAuthorizationRepository';
import { PrismaBuildingRepository } from '../infra/repositories/PrismaBuildingRepository';
import { PrismaTerminalRepository } from '../infra/repositories/PrismaTerminalRepository';
import { PrismaUserRepository } from '../infra/repositories/PrismaUserRepository';
import { BcryptHashProvider } from '../infra/providers/BcryptHashProvider';
import { CryptoRandom } from '../infra/providers/CryptoRandom';
import { JwtTokenProvider } from '../infra/providers/JwtTokenProvider';
import { PrismaDatabaseProbe } from '../infra/providers/PrismaDatabaseProbe';
import { createPino, PinoLogger } from '../infra/providers/PinoLogger';
import { SystemClock } from '../infra/providers/SystemClock';
import { UuidGenerator } from '../infra/providers/UuidGenerator';
import type { IClock } from '../providers/IClock';
import type { IDatabaseProbe } from '../providers/IDatabaseProbe';
import type { IHashProvider } from '../providers/IHashProvider';
import type { IIdGenerator } from '../providers/IIdGenerator';
import type { ILogger } from '../providers/ILogger';
import type { ITokenProvider } from '../providers/ITokenProvider';
import type { ISecureRandom } from '../providers/ISecureRandom';
import type { IAccessPointRepository } from '../repositories/IAccessPointRepository';
import type { IAuthorizationRepository } from '../repositories/IAuthorizationRepository';
import type { IBuildingRepository } from '../repositories/IBuildingRepository';
import type { ITerminalRepository } from '../repositories/ITerminalRepository';
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
  ids: new UuidGenerator() as IIdGenerator,
  random: new CryptoRandom() as ISecureRandom,
  databaseProbe: new PrismaDatabaseProbe(prisma) as IDatabaseProbe,
  hash: new BcryptHashProvider(env.BCRYPT_COST) as IHashProvider,
  tokens: new JwtTokenProvider(env.JWT_SECRET, env.JWT_EXPIRES_IN, clock) as ITokenProvider,
  users: new PrismaUserRepository(prisma) as IUserRepository,
  buildings: new PrismaBuildingRepository(prisma) as IBuildingRepository,
  accessPoints: new PrismaAccessPointRepository(prisma) as IAccessPointRepository,
  terminals: new PrismaTerminalRepository(prisma) as ITerminalRepository,
  authorizations: new PrismaAuthorizationRepository(prisma) as IAuthorizationRepository,
};
