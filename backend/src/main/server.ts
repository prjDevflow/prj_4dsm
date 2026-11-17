import { createGracefulShutdown } from '../infra/http/gracefulShutdown';
import { PurgeJob } from '../infra/jobs/PurgeJob';
import { PurgeExpiredCommandsUseCase } from '../useCases/TerminalChannel/PurgeExpiredCommands/PurgeExpiredCommands_UseCase';
import { PurgeExpiredCredentialsUseCase } from '../useCases/TerminalChannel/PurgeExpiredCredentials/PurgeExpiredCredentials_UseCase';
import { app } from './app';
import { container } from './container';

const { env, logger, appVersion } = container;

const PURGE_INTERVAL_MS = 60_000;
// Below the 30 s that Azure Container Apps waits after SIGTERM before killing the container.
const SHUTDOWN_TIMEOUT_MS = 20_000;

const server = app.listen(env.PORT, () => {
  logger.info('Servidor iniciado', { port: env.PORT, env: env.NODE_ENV, version: appVersion });
});

// Jobs start here and never in app.ts, so the tests that import the app do not get timers.
const purgeExpiredCredentials = new PurgeExpiredCredentialsUseCase(
  container.qrCredentials,
  container.clock,
  { purgeAfterHours: env.QR_PURGE_AFTER_HOURS },
);
const credentialsJob = new PurgeJob(
  () => purgeExpiredCredentials.execute(),
  logger,
  PURGE_INTERVAL_MS,
  {
    apagou: 'Credenciais QR vencidas apagadas',
    falhou: 'Falha ao apagar credenciais QR vencidas',
  },
);
credentialsJob.start();

const purgeExpiredCommands = new PurgeExpiredCommandsUseCase(
  container.terminalCommands,
  container.clock,
  { purgeAfterHours: env.COMMAND_PURGE_AFTER_HOURS },
);
const commandsJob = new PurgeJob(() => purgeExpiredCommands.execute(), logger, PURGE_INTERVAL_MS, {
  apagou: 'Comandos do terminal vencidos apagados',
  falhou: 'Falha ao apagar comandos do terminal vencidos',
});
commandsJob.start();

const shutdown = createGracefulShutdown({
  server,
  stopJobs: [() => credentialsJob.stop(), () => commandsJob.stop()],
  disconnect: () => container.prisma.$disconnect(),
  logger,
  exit: (code) => process.exit(code),
  timeoutMs: SHUTDOWN_TIMEOUT_MS,
});
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
