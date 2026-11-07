import { z } from 'zod';

// `strict` turns any other field (the UID and the user are fixed) into a 422, and `ativa` is required.
export const UpdateNfcTagSchema = z
  .object({
    ativa: z.boolean({ error: 'deve ser verdadeiro ou falso' }),
  })
  .strict();

export type IUpdateNfcTagDTO = z.infer<typeof UpdateNfcTagSchema>;
