import { z } from 'zod';

const portMessage = 'deve ser um número inteiro entre 1 e 65535';

const EnvSchema = z.object({
  PORT: z.coerce
    .number({ error: portMessage })
    .int(portMessage)
    .min(1, portMessage)
    .max(65535, portMessage)
    .default(3000),
  NODE_ENV: z
    .enum(['development', 'test', 'production'], {
      error: 'deve ser development, test ou production',
    })
    .default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'], {
      error: 'deve ser fatal, error, warn, info, debug, trace ou silent',
    })
    .default('info'),
  CORS_ORIGINS: z
    .string({ error: 'obrigatória' })
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string()).min(1, 'obrigatória')),
});

export type Env = z.infer<typeof EnvSchema>;

export class InvalidEnvError extends Error {
  override name = 'InvalidEnvError';
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  // Empty values behave as unset so defaults apply.
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''));
  const result = EnvSchema.safeParse(cleaned);

  if (!result.success) {
    const lines = result.error.issues.map((issue) => `- ${issue.path.join('.')}: ${issue.message}`);
    throw new InvalidEnvError(`Configuração inválida:\n${lines.join('\n')}`);
  }

  return result.data;
}
