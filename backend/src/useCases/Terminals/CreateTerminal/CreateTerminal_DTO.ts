import { z } from 'zod';
import { requiredText } from '../../../shared/fields';

export const TerminalNameSchema = requiredText(120);

export const CreateTerminalSchema = z.object({
  accessPointId: z.guid({ error: 'deve ser um id válido' }),
  nome: TerminalNameSchema,
});

export type ICreateTerminalDTO = z.infer<typeof CreateTerminalSchema>;
