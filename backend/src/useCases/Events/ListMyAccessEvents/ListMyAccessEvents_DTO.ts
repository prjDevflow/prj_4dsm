import { z } from 'zod';
import { accessEventFilterShape } from '../accessEventQuery';

// No `usuarioId`: whose events these are comes from the token. A `usuarioId` sent in the query is
// not part of the schema, so zod drops it.
export const ListMyAccessEventsSchema = z.object({ ...accessEventFilterShape });

export type IListMyAccessEventsDTO = z.infer<typeof ListMyAccessEventsSchema>;
