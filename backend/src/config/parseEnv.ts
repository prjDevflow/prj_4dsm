import { z } from 'zod';

const portMessage = 'deve ser um número inteiro entre 1 e 65535';
const durationMessage = 'deve ser um número inteiro positivo seguido de s, m, h ou d (ex.: 12h)';
const costMessage = 'deve ser um inteiro entre 4 e 15';
const loginLimitMessage = 'deve ser um número inteiro maior que zero';

const SECONDS_PER_UNIT = { s: 1, m: 60, h: 3600, d: 86400 } as const;

function durationToSeconds(value: string) {
  const unit = value.slice(-1) as keyof typeof SECONDS_PER_UNIT;
  return Number(value.slice(0, -1)) * SECONDS_PER_UNIT[unit];
}

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
  DATABASE_URL: z
    .string({ error: 'obrigatória' })
    .regex(/^postgres(ql)?:\/\//, 'deve começar com postgresql://'),
  JWT_SECRET: z.string({ error: 'obrigatória' }).min(32, 'deve ter no mínimo 32 caracteres'),
  // Written as 30s, 15m, 12h or 7d; the rest of the code only sees seconds.
  JWT_EXPIRES_IN: z
    .string()
    .default('12h')
    .pipe(z.string().regex(/^[1-9]\d*[smhd]$/, durationMessage))
    .transform(durationToSeconds),
  BCRYPT_COST: z.coerce
    .number({ error: costMessage })
    .int(costMessage)
    .min(4, costMessage)
    .max(15, costMessage)
    .default(10),
  LOGIN_MAX_PER_MINUTE: z.coerce
    .number({ error: loginLimitMessage })
    .int(loginLimitMessage)
    .min(1, loginLimitMessage)
    .default(5),
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
