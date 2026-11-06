import { z } from 'zod';
import { paginationShape } from '../../../shared/pagination';

export const ListBuildingsSchema = z.object({
  ativo: z
    .enum(['true', 'false'], { error: 'deve ser true ou false' })
    .transform((value) => value === 'true')
    .optional(),
  ...paginationShape,
});

export type IListBuildingsDTO = z.infer<typeof ListBuildingsSchema>;
