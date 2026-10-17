import pino, { type Logger } from 'pino';
import type { Env } from '../../config/parseEnv';
import type { ILogger, LogMeta } from '../../providers/ILogger';

export function createPino(level: Env['LOG_LEVEL']): Logger {
  return pino({
    level,
    // Credentials must never reach the logs.
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-terminal-key"]'],
      censor: '[oculto]',
    },
  });
}

export class PinoLogger implements ILogger {
  constructor(private logger: Logger) {}

  info(message: string, meta: LogMeta = {}) {
    this.logger.info(meta, message);
  }

  warn(message: string, meta: LogMeta = {}) {
    this.logger.warn(meta, message);
  }

  error(message: string, meta: LogMeta = {}) {
    this.logger.error(meta, message);
  }
}
