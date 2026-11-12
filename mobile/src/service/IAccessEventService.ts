import type {
  EventoDeAcesso,
  ListAccessEventsParams,
  ListMyAccessEventsParams,
} from '@/lib/types/accessEvents';
import type { Page } from '@/lib/types/page';

/** Admin only. The newest first; the filters combine. */
export interface IListAccessEventsService {
  exec: (params: ListAccessEventsParams) => Promise<Page<EventoDeAcesso>>;
}

/** Any profile: only the attempts of the logged-in person. */
export interface IListMyAccessEventsService {
  exec: (params: ListMyAccessEventsParams) => Promise<Page<EventoDeAcesso>>;
}
