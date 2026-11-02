import { z } from 'zod';
import { nomeField, requiredId } from '../locations/locations.schema';

/** T21 Terminal. The access point is chosen only on create; then it never changes. */
export const terminalFormSchema = z.object({
  nome: nomeField,
  accessPointId: requiredId('Escolha o ponto de acesso.'),
});

export type TerminalFormValues = z.input<typeof terminalFormSchema>;
export type TerminalFormOutput = z.output<typeof terminalFormSchema>;
