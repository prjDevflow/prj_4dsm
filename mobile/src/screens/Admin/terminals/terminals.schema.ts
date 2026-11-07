import { z } from 'zod';
import { nomeField, requiredId } from '../locations/locations.schema';

/** T21 Terminal. The access point is chosen only on create; then it never changes. */
export const terminalFormSchema = z.object({
  nome: nomeField,
  accessPointId: requiredId('Escolha o ponto de acesso.'),
});

export type TerminalFormValues = z.input<typeof terminalFormSchema>;
export type TerminalFormOutput = z.output<typeof terminalFormSchema>;

/** T21 detail: only the name and the active switch change. */
export const terminalEditSchema = z.object({ nome: nomeField, ativo: z.boolean() });

export type TerminalEditValues = z.input<typeof terminalEditSchema>;
export type TerminalEditOutput = z.output<typeof terminalEditSchema>;
