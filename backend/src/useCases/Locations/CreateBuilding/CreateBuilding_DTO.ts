import { z } from 'zod';
import { latitudeField, longitudeField, requiredText } from '../../../shared/fields';

export const CreateBuildingSchema = z.object({
  nome: requiredText(120),
  endereco: requiredText(255),
  latitude: latitudeField,
  longitude: longitudeField,
  ativo: z.boolean({ error: 'deve ser verdadeiro ou falso' }).optional(),
});

export type ICreateBuildingDTO = z.infer<typeof CreateBuildingSchema>;
