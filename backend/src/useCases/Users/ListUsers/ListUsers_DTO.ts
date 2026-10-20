import { z } from 'zod';
import { paginationShape } from '../../../shared/pagination';

export const ListUsersSchema = z.object({
  perfil: z
    .enum(['ADMIN', 'CONDOMINO', 'VISITANTE'], {
      error: 'deve ser ADMIN, CONDOMINO ou VISITANTE',
    })
    .optional(),
  ativo: z
    .enum(['true', 'false'], { error: 'deve ser true ou false' })
    .transform((value) => value === 'true')
    .optional(),
  q: z.string().trim().max(120, 'deve ter no máximo 120 caracteres').optional(),
  ...paginationShape,
});

export type IListUsersDTO = z.infer<typeof ListUsersSchema>;
