import { z } from 'zod';
import { dateField } from '../../../shared/fields';
import { paginationShape } from '../../../shared/pagination';

export const EFFECTIVE_STATUSES = ['ATIVA', 'EXPIRADA', 'ESGOTADA', 'CANCELADA'] as const;

export const effectiveStatusField = z.enum(EFFECTIVE_STATUSES, {
  error: 'deve ser ATIVA, EXPIRADA, ESGOTADA ou CANCELADA',
});

export const ListAuthorizationsSchema = z
  .object({
    usuarioId: z.guid({ error: 'deve ser um id válido' }).optional(),
    accessPointId: z.guid({ error: 'deve ser um id válido' }).optional(),
    situacao: effectiveStatusField.optional(),
    dataDe: dateField.optional(),
    dataAte: dateField.optional(),
    ...paginationShape,
  })
  .refine((query) => !query.dataDe || !query.dataAte || query.dataDe <= query.dataAte, {
    path: ['dataAte'],
    error: 'deve ser igual ou depois de dataDe',
  });

export type IListAuthorizationsDTO = z.infer<typeof ListAuthorizationsSchema>;
