import { z } from 'zod';
import { accessEventFilterShape, idField } from '../accessEventQuery';

export const ListAccessEventsSchema = z.object({
  usuarioId: idField.optional(),
  ...accessEventFilterShape,
});

export type IListAccessEventsDTO = z.infer<typeof ListAccessEventsSchema>;
