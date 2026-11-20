import { z } from 'zod';
import { NO_NUL_MESSAGE, hasNoNul } from '../../../shared/noNul';
import { uidField } from '../uidField';

export const CreateNfcTagSchema = z.object({
  usuarioId: z.guid({ error: 'deve ser um id válido' }),
  uid: uidField,
  // Blank means "no description".
  descricao: z
    .string({ error: 'deve ser um texto' })
    .trim()
    .max(120, 'deve ter no máximo 120 caracteres')
    .refine(hasNoNul, NO_NUL_MESSAGE)
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
});

export type ICreateNfcTagDTO = z.infer<typeof CreateNfcTagSchema>;
