import { z } from 'zod';
import { dateField, timeField } from '../../../shared/fields';

// Only the shape is checked here; the order between the dates and between the times is a rule of the use case.

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
