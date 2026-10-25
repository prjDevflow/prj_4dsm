import { z } from 'zod';
import { CreateAccessPointSchema } from '../CreateAccessPoint/CreateAccessPoint_DTO';

// `strict` turns any unknown field into a 422, which is how `buildingId` (fixed) is refused.
export const UpdateAccessPointSchema = CreateAccessPointSchema.omit({ buildingId: true })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'informe ao menos um campo para alterar',
    path: ['corpo'],
  });

export type IUpdateAccessPointDTO = z.infer<typeof UpdateAccessPointSchema>;
