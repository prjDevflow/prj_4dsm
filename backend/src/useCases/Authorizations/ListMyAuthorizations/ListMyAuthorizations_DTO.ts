import { z } from 'zod';
import { paginationShape } from '../../../shared/pagination';
import { effectiveStatusField } from '../ListAuthorizations/ListAuthorizations_DTO';

// No `usuarioId`: whose authorizations these are comes from the token. A `usuarioId` sent in the
// query is not part of the schema, so zod drops it.
export const ListMyAuthorizationsSchema = z.object({
  situacao: effectiveStatusField.optional(),
  ...paginationShape,
});

export type IListMyAuthorizationsDTO = z.infer<typeof ListMyAuthorizationsSchema>;
