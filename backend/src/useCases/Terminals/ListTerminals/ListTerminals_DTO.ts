import { z } from 'zod';
import { paginationShape } from '../../../shared/pagination';

export const ListTerminalsSchema = z.object({ ...paginationShape });

export type IListTerminalsDTO = z.infer<typeof ListTerminalsSchema>;
