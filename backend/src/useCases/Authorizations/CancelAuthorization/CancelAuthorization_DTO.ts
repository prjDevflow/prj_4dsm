import { z } from 'zod';
import { NO_NUL_MESSAGE, hasNoNul } from '../../../shared/noNul';

export const CancelAuthorizationSchema = z.object({
  motivo: z
    .string({ error: 'deve ser um texto' })
    .trim()
    .max(200, 'deve ter no máximo 200 caracteres')
    .refine(hasNoNul, NO_NUL_MESSAGE)
    .optional(),
});

export type ICancelAuthorizationDTO = z.infer<typeof CancelAuthorizationSchema>;
