import { z } from 'zod';

// Format only; the order between the dates and between the times is a business rule of the use case.
const dateField = z
  .string({ error: 'obrigatório' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'deve estar no formato AAAA-MM-DD');
const timeField = z
  .string({ error: 'obrigatório' })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'deve estar no formato HH:mm');

export const CreateAuthorizationSchema = z.object({
  usuarioId: z.guid({ error: 'deve ser um id válido' }),
  accessPointId: z.guid({ error: 'deve ser um id válido' }),
  dataInicio: dateField,
  dataFim: dateField,
  horaInicio: timeField,
  horaFim: timeField,
  usosPermitidos: z
    .number({ error: 'deve ser um número inteiro de 1 a 1000' })
    .int('deve ser um número inteiro de 1 a 1000')
    .min(1, 'deve ser de 1 a 1000')
    .max(1000, 'deve ser de 1 a 1000'),
});

export type ICreateAuthorizationDTO = z.infer<typeof CreateAuthorizationSchema>;
