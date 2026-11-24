import { z } from 'zod';
import { requiredId } from '../../locations/locations.schema';

const USOS = 'Informe de 1 a 1000 entradas.';

/** A date or time picked in the field: starts empty (null) only when the screen has no default. */
const required = (missing: string) =>
  z
    .string({ error: missing })
    .nullable()
    .pipe(z.string({ error: missing }));

/**
 * T24 Nova autorização: the eight fields of RF03, with the same rules as the server (B08).
 * `today` ("YYYY-MM-DD", the phone's day) decides what "in the past" means.
 */
export const authorizationFormSchema = (today: string) =>
  z
    .object({
      usuarioId: requiredId('Escolha a pessoa.'),
      accessPointId: requiredId('Escolha o local.'),
      dataInicio: required('Informe a data inicial.'),
      dataFim: required('Informe a data final.'),
      horaInicio: required('Informe o horário inicial.'),
      horaFim: required('Informe o horário final.'),
      usosPermitidos: z
        .number({ error: USOS })
        .int({ error: USOS })
        .min(1, { error: USOS })
        .max(1000, { error: USOS }),
    })
    // The rules between fields run even when other fields have errors, so all show at once.
    .refine((v) => !v.dataInicio || !v.dataFim || v.dataFim >= v.dataInicio, {
      error: 'A data final não pode ser antes da inicial.',
      path: ['dataFim'],
      when: () => true,
    })
    .refine(
      (v) =>
        !v.dataFim || (v.dataInicio !== null && v.dataFim < v.dataInicio) || v.dataFim >= today,
      { error: 'A data final não pode estar no passado.', path: ['dataFim'], when: () => true },
    )
    // "HH:mm" with two digits compares as text in the right order.
    .refine((v) => !v.horaInicio || !v.horaFim || v.horaFim > v.horaInicio, {
      error: 'O horário final precisa ser depois do inicial.',
      path: ['horaFim'],
      when: () => true,
    });

export type AuthorizationFormValues = z.input<ReturnType<typeof authorizationFormSchema>>;
export type AuthorizationFormOutput = z.output<ReturnType<typeof authorizationFormSchema>>;
