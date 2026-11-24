import { z } from 'zod';
import {
  PERIOD_ORDER_ISSUE,
  accessEventFilterShape,
  idField,
  periodIsOrdered,
} from '../accessEventQuery';

export const ListAccessEventsSchema = z
  .object({
    usuarioId: idField.optional(),
    ...accessEventFilterShape,
  })
  .refine(periodIsOrdered, PERIOD_ORDER_ISSUE);

export type IListAccessEventsDTO = z.infer<typeof ListAccessEventsSchema>;
