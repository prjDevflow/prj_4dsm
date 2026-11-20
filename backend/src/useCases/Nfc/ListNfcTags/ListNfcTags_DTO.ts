import { z } from 'zod';
import { paginationShape } from '../../../shared/pagination';

export const ListNfcTagsSchema = z.object({
  usuarioId: z.guid({ error: 'deve ser um id válido' }).optional(),
  ativa: z
    .enum(['true', 'false'], { error: 'deve ser true ou false' })
    .transform((value) => value === 'true')
    .optional(),
  ...paginationShape,
});

export type IListNfcTagsDTO = z.infer<typeof ListNfcTagsSchema>;
