import { PrismaPg } from '@prisma/adapter-pg';
import type { ILogger } from '../../providers/ILogger';
import { PrismaClient } from '../../generated/prisma/client';

// Short on purpose: an unreachable database must fail fast so /health can report "down".
const CONNECTION_TIMEOUT_MS = 2000;

/** The only place that creates a PrismaClient. Connects lazily, on the first query. */
export function createPrismaClient(databaseUrl: string, logger: ILogger): PrismaClient {
  const adapter = new PrismaPg(
    { connectionString: databaseUrl, connectionTimeoutMillis: CONNECTION_TIMEOUT_MS },
    {
      // Without these handlers a stopped database would crash the process on the pool's 'error' event.
      onPoolError: (error) => logger.error('Erro no pool do banco', { message: error.message }),
      onConnectionError: (error) =>
        logger.error('Erro na conexão com o banco', { message: error.message }),
    },
  );
  return new PrismaClient({ adapter });
}
