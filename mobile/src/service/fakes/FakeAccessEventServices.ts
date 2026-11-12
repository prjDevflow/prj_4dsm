import { useSessionStore } from '@/context/SessionStore';
import type {
  EventoDeAcesso,
  ListAccessEventsParams,
  ListMyAccessEventsParams,
} from '@/lib/types/accessEvents';
import type { Page } from '@/lib/types/page';
import { ApiError } from '../ApiError';
import type { IListAccessEventsService, IListMyAccessEventsService } from '../IAccessEventService';
import { FakeAccessEventDirectory } from './FakeAccessEventDirectory';

const shared = new FakeAccessEventDirectory();

export class FakeListAccessEventsService implements IListAccessEventsService {
  readonly calls: ListAccessEventsParams[] = [];

  constructor(private directory = shared) {}

  async exec(params: ListAccessEventsParams): Promise<Page<EventoDeAcesso>> {
    this.calls.push(params);
    return this.directory.list(params);
  }
}

export class FakeListMyAccessEventsService implements IListMyAccessEventsService {
  readonly calls: ListMyAccessEventsParams[] = [];

  constructor(private directory = shared) {}

  async exec(params: ListMyAccessEventsParams): Promise<Page<EventoDeAcesso>> {
    this.calls.push(params);
    const usuario = useSessionStore.getState().usuario;
    if (!usuario) throw new ApiError(401, 'UNAUTHORIZED', 'Sem sessão');
    return this.directory.listMine(usuario.id, params);
  }
}
