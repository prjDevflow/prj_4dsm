import { z } from 'zod';

// bcrypt reads only the first 72 bytes, so a longer password would be cut without warning.
const MAX_PASSWORD_BYTES = 72;

export const CreateUserSchema = z.object({
  nome: z
    .string({ error: 'obrigatório' })
    .trim()
    .min(3, 'deve ter no mínimo 3 caracteres')
    .max(120, 'deve ter no máximo 120 caracteres'),
  email: z
    .string({ error: 'obrigatório' })
    .trim()
    .max(254, 'deve ter no máximo 254 caracteres')
    .pipe(z.email('formato de e-mail inválido')),
  perfil: z.enum(['ADMIN', 'CONDOMINO', 'VISITANTE'], {
    error: 'deve ser ADMIN, CONDOMINO ou VISITANTE',
  }),
  senha: z
    .string({ error: 'obrigatória' })
    .min(8, 'deve ter no mínimo 8 caracteres')
    .refine((s) => Buffer.byteLength(s) <= MAX_PASSWORD_BYTES, 'deve ter no máximo 72 bytes'),
});

export type ICreateUserDTO = z.infer<typeof CreateUserSchema>;
