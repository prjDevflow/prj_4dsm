import { z } from 'zod';
import { latitudeField, longitudeField, requiredText } from '../../../shared/fields';

export const CreateAccessPointSchema = z.object({
  buildingId: z.guid({ error: 'deve ser um id válido' }),
  tipo: z.enum(['PORTARIA', 'PORTA', 'CATRACA'], {
    error: 'deve ser PORTARIA, PORTA ou CATRACA',
  }),
  nome: requiredText(120),
  identificacao: requiredText(60),
  latitude: latitudeField,
  longitude: longitudeField,
  ativo: z.boolean({ error: 'deve ser verdadeiro ou falso' }).optional(),
});

export type ICreateAccessPointDTO = z.infer<typeof CreateAccessPointSchema>;
