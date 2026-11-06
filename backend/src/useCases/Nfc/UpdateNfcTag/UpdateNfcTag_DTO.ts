import { z } from 'zod';

// `strict` turns any unknown field into a 422: the UID and the owner of a tag are fixed.
export const UpdateNfcTagSchema = z
  .object({ ativa: z.boolean({ error: 'deve ser verdadeiro ou falso' }) })
  .strict();

export type IUpdateNfcTagDTO = z.infer<typeof UpdateNfcTagSchema>;
