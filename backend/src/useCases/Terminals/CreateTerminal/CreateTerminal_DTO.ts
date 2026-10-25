import { z } from 'zod';
import { NO_NUL_MESSAGE, hasNoNul } from '../../../shared/noNul';

export const TerminalNameSchema = z
  .string({ error: 'obrigatório' })
  .trim()
  .min(1, 'obrigatório')
  .max(120, 'deve ter no máximo 120 caracteres')
  .refine(hasNoNul, NO_NUL_MESSAGE);

export const CreateTerminalSchema = z.object({
  accessPointId: z.guid({ error: 'deve ser um id válido' }),
  nome: TerminalNameSchema,
});

export type ICreateTerminalDTO = z.infer<typeof CreateTerminalSchema>;
