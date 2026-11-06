import { z } from 'zod';
import { latitudeField, longitudeField, requiredText } from '../../../shared/fields';

const nonNegativeInt = z
  .number({ error: 'deve ser um número inteiro maior ou igual a zero' })
  .int('deve ser um número inteiro maior ou igual a zero')
  .min(0, 'deve ser um número inteiro maior ou igual a zero');

// Not strict: a newer firmware may send fields this version does not know, and they are ignored.
export const RegisterHeartbeatSchema = z
  .object({
    // Without a fix the terminal may omit the position or send null.
    latitude: latitudeField.nullish(),
    longitude: longitudeField.nullish(),
    gpsFix: z.boolean({ error: 'deve ser verdadeiro ou falso' }),
    gpsSimulado: z.boolean({ error: 'deve ser verdadeiro ou falso' }).default(false),
    firmware: requiredText(40),
    wifiRssi: z
      .number({ error: 'deve ser um número inteiro entre -127 e 0' })
      .int('deve ser um número inteiro entre -127 e 0')
      .min(-127, 'deve ser um número inteiro entre -127 e 0')
      .max(0, 'deve ser um número inteiro entre -127 e 0')
      .optional(),
    // Accepted and not stored: there is no column for them.
    uptimeS: nonNegativeInt.optional(),
    eventosPendentes: nonNegativeInt.optional(),
  })
  .superRefine((body, ctx) => {
    if (!body.gpsFix) return;
    for (const field of ['latitude', 'longitude'] as const) {
      if (body[field] == null) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: 'obrigatório quando gpsFix é verdadeiro',
        });
      }
    }
  });

export type IRegisterHeartbeatDTO = z.infer<typeof RegisterHeartbeatSchema>;
