import { z } from 'zod';
import { CreateUserSchema } from '../CreateUser/CreateUser_DTO';

// `strict` turns any unknown field into a 422, which is how `email` (immutable) is refused.
export const UpdateUserSchema = z
  .object({
    nome: CreateUserSchema.shape.nome,
    perfil: CreateUserSchema.shape.perfil,
    ativo: z.boolean({ error: 'deve ser verdadeiro ou falso' }),
    senha: CreateUserSchema.shape.senha,
  })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, 'informe ao menos um campo para alterar');

export type IUpdateUserDTO = z.infer<typeof UpdateUserSchema>;
