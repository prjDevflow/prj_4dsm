import { z } from 'zod';

const portMessage = 'deve ser um número inteiro entre 1 e 65535';
const durationMessage = 'deve ser um número inteiro positivo seguido de s, m, h ou d (ex.: 12h)';
const costMessage = 'deve ser um inteiro entre 4 e 15';
const loginLimitMessage = 'deve ser um número inteiro maior que zero';
const onlineWindowMessage = 'deve ser um número inteiro de segundos maior que zero';
const positiveIntMessage = 'deve ser um número inteiro maior que zero';

const positiveInt = (defaultValue: number) =>
  z.coerce
    .number({ error: positiveIntMessage })
    .int(positiveIntMessage)
    .min(1, positiveIntMessage)
    .default(defaultValue);

const nonNegativeIntMessage = 'deve ser um número inteiro maior ou igual a zero';

const nonNegativeInt = (defaultValue: number) =>
  z.coerce
    .number({ error: nonNegativeIntMessage })
    .int(nonNegativeIntMessage)
    .min(0, nonNegativeIntMessage)
    .default(defaultValue);

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
  // A terminal is online when its last contact is less than this many seconds old.
  TERMINAL_ONLINE_WINDOW_S: z.coerce
    .number({ error: onlineWindowMessage })
    .int(onlineWindowMessage)
    .min(1, onlineWindowMessage)
    .default(30),
  // Heartbeat (B11): minimum seconds between two heartbeats of one terminal, and the settings the
  // reply hands to the terminal (all in milliseconds).
  HEARTBEAT_MIN_INTERVAL_S: positiveInt(2),
  QR_REFRESH_MS: positiveInt(10000),
  COMMAND_POLL_MS: positiveInt(1000),
  OPEN_DURATION_MS: positiveInt(5000),
  // QR emission (B12): life of a code is TTL + tolerance; one issue per terminal per interval (seconds);
  // codes expired for longer than the purge window (hours) are deleted.
  QR_TTL_SECONDS: positiveInt(10),
  QR_TOLERANCE_SECONDS: nonNegativeInt(5),
  QR_ISSUE_MIN_INTERVAL_S: positiveInt(5),
  QR_PURGE_AFTER_HOURS: positiveInt(1),
  // Where the proximity check takes the terminal position from, and how old a GPS reading may be (minutes).
  TERMINAL_POSITION_SOURCE: z
    .enum(['GPS_COM_FALLBACK', 'CADASTRO', 'GPS'], {
      error: 'deve ser GPS_COM_FALLBACK, CADASTRO ou GPS',
    })
    .default('GPS_COM_FALLBACK'),
  GPS_MAX_AGE_MIN: positiveInt(10),
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
