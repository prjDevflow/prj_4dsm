import { z } from 'zod';
import { uidField } from '../uidField';

/**
 * The body and the header of one read, parsed together so that every problem comes back in one 422.
 * `lidoEm` is checked but never used: the server's clock decides, so a terminal with a wrong clock
 * cannot change the outcome.
 */
export const ValidateNfcAccessSchema = z.object({
  uid: uidField,
  lidoEm: z.iso.datetime({ offset: true, error: 'deve ser um instante ISO 8601' }).optional(),
  'Idempotency-Key': z
    .guid({ error: 'deve ser um UUID' })
    // Stored in lowercase, so the same key written in capitals is the same key.
    .transform((key) => key.toLowerCase()),
});

export type IValidateNfcAccessDTO = z.infer<typeof ValidateNfcAccessSchema>;
