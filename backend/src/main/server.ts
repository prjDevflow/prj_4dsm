import { PurgeExpiredCredentialsJob } from '../infra/jobs/PurgeExpiredCredentialsJob';
import { PurgeExpiredCredentialsUseCase } from '../useCases/TerminalChannel/PurgeExpiredCredentials/PurgeExpiredCredentials_UseCase';
import { app } from './app';
import { container } from './container';

const { env, logger, appVersion } = container;

const PURGE_INTERVAL_MS = 60_000;

app.listen(env.PORT, () => {
  logger.info('Servidor iniciado', { port: env.PORT, env: env.NODE_ENV, version: appVersion });
});

// Jobs start here and never in app.ts, so the tests that import the app do not get timers.
const purgeExpiredCredentials = new PurgeExpiredCredentialsUseCase(
  container.qrCredentials,
  container.clock,
  { purgeAfterHours: env.QR_PURGE_AFTER_HOURS },
);
new PurgeExpiredCredentialsJob(
  () => purgeExpiredCredentials.execute(),
  logger,
  PURGE_INTERVAL_MS,
).start();
