import type { ILogger, LogMeta } from '../../src/providers/ILogger';

export interface LoggedEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  meta?: LogMeta;
}

/** Remembers every call so a test can assert what was logged. */
export class SpyLogger implements ILogger {
  entries: LoggedEntry[] = [];

  info(message: string, meta?: LogMeta) {
    this.entries.push({ level: 'info', message, meta });
  }

  warn(message: string, meta?: LogMeta) {
    this.entries.push({ level: 'warn', message, meta });
  }

  error(message: string, meta?: LogMeta) {
    this.entries.push({ level: 'error', message, meta });
  }

  of(level: LoggedEntry['level']) {
    return this.entries.filter((entry) => entry.level === level);
  }
}
