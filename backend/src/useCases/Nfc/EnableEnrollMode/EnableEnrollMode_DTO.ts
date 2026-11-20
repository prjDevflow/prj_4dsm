import { z } from 'zod';

export const EnableEnrollModeSchema = z.object({
  usuarioId: z.guid({ error: 'deve ser um id válido' }),
});

export type IEnableEnrollModeDTO = z.infer<typeof EnableEnrollModeSchema>;
