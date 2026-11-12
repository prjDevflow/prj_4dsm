import type {
  EventoDeAcesso,
  ListAccessEventsParams,
  ListMyAccessEventsParams,
} from '@/lib/types/accessEvents';
import type { Page } from '@/lib/types/page';
import { AxiosInstance } from '../AxiosInstance';
import type { IListAccessEventsService, IListMyAccessEventsService } from '../IAccessEventService';

// /access-events and /me/access-events (B18). Axios leaves out the filters that are undefined.

export class ListAccessEventsService implements IListAccessEventsService {
  async exec(params: ListAccessEventsParams): Promise<Page<EventoDeAcesso>> {
    const { data } = await AxiosInstance.get<Page<EventoDeAcesso>>('/access-events', { params });
    return data;
  }
}

export class ListMyAccessEventsService implements IListMyAccessEventsService {
  async exec(params: ListMyAccessEventsParams): Promise<Page<EventoDeAcesso>> {
    const { data } = await AxiosInstance.get<Page<EventoDeAcesso>>('/me/access-events', {
      params,
    });
    return data;
  }
}
