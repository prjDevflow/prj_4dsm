import { z } from 'zod';

export const LoginSchema = z.object({
  email: z
    .string({ error: 'obrigatório' })
    .max(254, 'deve ter no máximo 254 caracteres')
    .pipe(z.email('formato de e-mail inválido')),
  // 72 is the bcrypt limit.
  senha: z
    .string({ error: 'obrigatória' })
    .min(1, 'obrigatória')
    .max(72, 'deve ter no máximo 72 caracteres'),
});

export type ILoginUserDTO = z.infer<typeof LoginSchema>;
