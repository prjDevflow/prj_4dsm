import { z } from 'zod';
import { InvalidEnvError } from './parseEnv';

const passwordMessage = 'deve ter de 8 a 72 caracteres'; // 72 bytes is the bcrypt limit

const requiredString = z.string({ error: 'obrigatória' });

const EnvSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'], {
        error: 'deve ser development, test ou production',
      })
      .default('development'),
    SEED_ADMIN_EMAIL: requiredString
      .trim()
      .toLowerCase()
      .pipe(z.email('deve ser um e-mail válido').max(254, 'deve ter até 254 caracteres')),
    SEED_ADMIN_PASSWORD: requiredString.min(8, passwordMessage).max(72, passwordMessage),
    SEED_USER_PASSWORD: requiredString.min(8, passwordMessage).max(72, passwordMessage),
    SEED_TERMINAL_KEY: requiredString.min(32, 'deve ter pelo menos 32 caracteres'),
    SEED_LATITUDE: z.coerce
      .number({ error: 'deve ser um número entre -90 e 90' })
      .min(-90, 'deve ser um número entre -90 e 90')
      .max(90, 'deve ser um número entre -90 e 90')
      .default(-23.30512),
    SEED_LONGITUDE: z.coerce
      .number({ error: 'deve ser um número entre -180 e 180' })
      .min(-180, 'deve ser um número entre -180 e 180')
      .max(180, 'deve ser um número entre -180 e 180')
      .default(-45.96551),
    BCRYPT_COST: z.coerce
      .number({ error: 'deve ser um inteiro entre 4 e 15' })
      .int('deve ser um inteiro entre 4 e 15')
      .min(4, 'deve ser um inteiro entre 4 e 15')
      .max(15, 'deve ser um inteiro entre 4 e 15')
      .default(10),
    SEED_ALLOW_PRODUCTION: z
      .string()
      .default('false')
      .transform((value) => value === 'true'),
  })
  // The development credentials are public (they are in the repository), so production is opt-in.
  .check((ctx) => {
    const { NODE_ENV, SEED_ALLOW_PRODUCTION } = ctx.value;
    if (NODE_ENV === 'production' && !SEED_ALLOW_PRODUCTION) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value,
        path: ['SEED_ALLOW_PRODUCTION'],
        message:
          'o seed é recusado com NODE_ENV=production; defina SEED_ALLOW_PRODUCTION=true para forçar',
      });
    }
  });

export type SeedEnv = z.infer<typeof EnvSchema>;

export function parseSeedEnv(source: Record<string, string | undefined>): SeedEnv {
  // Empty values behave as unset so defaults apply.
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''));
  const result = EnvSchema.safeParse(cleaned);

  if (!result.success) {
    const lines = result.error.issues.map((issue) => `- ${issue.path.join('.')}: ${issue.message}`);
    throw new InvalidEnvError(`Configuração do seed inválida:\n${lines.join('\n')}`);
  }

  return result.data;
}
