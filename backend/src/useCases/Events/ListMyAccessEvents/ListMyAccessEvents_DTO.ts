import { z } from 'zod';
import { paginationShape } from '../../../shared/pagination';

export const ListMyAccessEventsSchema = z.object({ ...paginationShape });

export type IListMyAccessEventsDTO = z.infer<typeof ListMyAccessEventsSchema>;
