import { z } from 'zod';
import { paginationShape } from '../../../shared/pagination';

export const ListAccessPointsSchema = z.object({
  buildingId: z.guid({ error: 'deve ser um id válido' }).optional(),
  tipo: z
    .enum(['PORTARIA', 'PORTA', 'CATRACA'], { error: 'deve ser PORTARIA, PORTA ou CATRACA' })
    .optional(),
  ativo: z
    .enum(['true', 'false'], { error: 'deve ser true ou false' })
    .transform((value) => value === 'true')
    .optional(),
  ...paginationShape,
});

export type IListAccessPointsDTO = z.infer<typeof ListAccessPointsSchema>;
