import { z } from 'zod';
import { CreateBuildingSchema } from '../CreateBuilding/CreateBuilding_DTO';

// `strict` turns any unknown field into a 422.
export const UpdateBuildingSchema = CreateBuildingSchema.partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'informe ao menos um campo para alterar',
    path: ['corpo'],
  });

export type IUpdateBuildingDTO = z.infer<typeof UpdateBuildingSchema>;
