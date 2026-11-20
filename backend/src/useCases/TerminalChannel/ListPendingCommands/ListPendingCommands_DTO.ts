import { z } from 'zod';

/** Largest value of the `id` column (`INTEGER`); anything above cannot match a command. */
const MAX_COMMAND_ID = 2_147_483_647;

/** A query-string integer: digits only, within `min..max`, and `defaultValue` when it is missing. */
const queryInt = (min: number, max: number, defaultValue: number) => {
  const message = `deve ser um número inteiro entre ${min} e ${max}`;
  return z
    .string({ error: message })
    .regex(/^\d+$/, message)
    .transform(Number)
    .pipe(z.number().min(min, message).max(max, message))
    .default(defaultValue);
};

export const ListPendingCommandsSchema = z.object({
  after: queryInt(0, MAX_COMMAND_ID, 0),
  limit: queryInt(1, 100, 10),
});

export type IListPendingCommandsDTO = z.infer<typeof ListPendingCommandsSchema>;
