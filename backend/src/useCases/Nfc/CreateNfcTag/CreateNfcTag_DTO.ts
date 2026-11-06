import { z } from 'zod';
import { NO_NUL_MESSAGE, hasNoNul } from '../../../shared/noNul';

export const CreateNfcTagSchema = z.object({
  usuarioId: z.guid({ error: 'deve ser um id válido' }),
  // Only the type here: `normalizeUid`, in the use case, decides whether the UID is valid.
  uid: z.string({ error: 'obrigatório' }),
  descricao: z
    .string({ error: 'deve ser um texto' })
    .trim()
    .max(120, 'deve ter no máximo 120 caracteres')
    .refine(hasNoNul, NO_NUL_MESSAGE)
    // A blank description is no description.
    .transform((descricao) => descricao || undefined)
    .optional(),
});

export type ICreateNfcTagDTO = z.infer<typeof CreateNfcTagSchema>;
