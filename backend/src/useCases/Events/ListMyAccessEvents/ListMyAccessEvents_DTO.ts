import { z } from 'zod';
import { PERIOD_ORDER_ISSUE, accessEventFilterShape, periodIsOrdered } from '../accessEventQuery';

// No `usuarioId`: whose events these are comes from the token. A `usuarioId` sent in the query is
// not part of the schema, so zod drops it.
export const ListMyAccessEventsSchema = z
  .object({ ...accessEventFilterShape })
  .refine(periodIsOrdered, PERIOD_ORDER_ISSUE);

export type IListMyAccessEventsDTO = z.infer<typeof ListMyAccessEventsSchema>;
