import 'dotenv/config';
import { parseEnv, InvalidEnvError, type Env } from './parseEnv';

function loadEnv(): Env {
  try {
    return parseEnv(process.env);
  } catch (error) {
    if (error instanceof InvalidEnvError) {
      // Fail fast at startup with a readable message instead of a stack trace.
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}

export const env = loadEnv();
