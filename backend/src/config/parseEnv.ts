export type NodeEnv = 'development' | 'test' | 'production';
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

export interface Env {
  PORT: number;
  NODE_ENV: NodeEnv;
  LOG_LEVEL: LogLevel;
  CORS_ORIGINS: string[];
}

export class InvalidEnvError extends Error {
  override name = 'InvalidEnvError';
}

export function parseEnv(_source: Record<string, string | undefined>): Env {
  throw new Error('Not implemented');
}
