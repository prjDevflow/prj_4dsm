import { app } from './app';
import { container } from './container';

const { env, logger, appVersion } = container;

app.listen(env.PORT, () => {
  logger.info('Servidor iniciado', { port: env.PORT, env: env.NODE_ENV, version: appVersion });
});
