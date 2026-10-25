import { z } from 'zod';
import { TerminalNameSchema } from '../CreateTerminal/CreateTerminal_DTO';

// `strict` turns any unknown field into a 422, which is how `accessPointId` (fixed) is refused.
export const UpdateTerminalSchema = z
  .object({
    nome: TerminalNameSchema,
    ativo: z.boolean({ error: 'deve ser verdadeiro ou falso' }),
  })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'informe ao menos um campo para alterar',
    path: ['corpo'],
  });

export type IUpdateTerminalDTO = z.infer<typeof UpdateTerminalSchema>;
