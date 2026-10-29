import { z } from 'zod';

const INVALID_EMAIL = 'Digite um e-mail válido. Exemplo: nome@email.com';

// Limits of the contract: e-mail up to 254, password up to 72 (bcrypt).
export const SchemaLoginUser = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: 'Informe seu e-mail.' })
    .max(254, { error: INVALID_EMAIL })
    .pipe(z.email({ error: INVALID_EMAIL })),
  senha: z
    .string()
    .min(1, { error: 'Informe sua senha.' })
    .max(72, { error: 'A senha tem no máximo 72 caracteres.' }),
});

export type SchemaLoginUserInput = z.input<typeof SchemaLoginUser>;
export type SchemaLoginUserType = z.output<typeof SchemaLoginUser>;
