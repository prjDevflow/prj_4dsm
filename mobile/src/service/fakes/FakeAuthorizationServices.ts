import { useSessionStore } from '@/context/SessionStore';
import type {
  Autorizacao,
  CreateAuthorizationBody,
  ListAuthorizationsParams,
  ListMyAuthorizationsParams,
} from '@/lib/types/authorizations';
import type { Page } from '@/lib/types/page';
import type { ApiError } from '../ApiError';
import type {
  ICancelAuthorizationService,
  ICreateAuthorizationService,
  IGetAuthorizationService,
  IListAuthorizationsService,
  IListMyAuthorizationsService,
} from '../IAuthorizationService';
import { FakeAuthorizationDirectory } from './FakeAuthorizationDirectory';
import { sharedLocationDirectory } from './FakeLocationServices';
import { sharedUserDirectory } from './FakeUserServices';

// One directory for the whole app in fake mode, with the same people and places as the other fakes.
const sharedDirectory = new FakeAuthorizationDirectory({
  users: sharedUserDirectory,
  locations: sharedLocationDirectory,
});

/** Like the server, who creates or cancels is who is logged in. */
const loggedIn = () => {
  const usuario = useSessionStore.getState().usuario;
  return { id: usuario?.id ?? '', nome: usuario?.nome ?? '' };
};

/**
 * Records each call in `calls`; willFail makes every next call fail with the given error
 * (null goes back to answering from the directory).
 */
abstract class FakeAuthorizationService<Call> {
  readonly calls: Call[] = [];
  private failure: ApiError | null = null;

  constructor(protected readonly directory: FakeAuthorizationDirectory = sharedDirectory) {}

  willFail(error: ApiError | null) {
    this.failure = error;
  }

  protected record(call: Call) {
    this.calls.push(call);
    if (this.failure) throw this.failure;
  }
}

export class FakeCreateAuthorizationService
  extends FakeAuthorizationService<CreateAuthorizationBody>
  implements ICreateAuthorizationService
{
  async exec(body: CreateAuthorizationBody): Promise<Autorizacao> {
    this.record(body);
    return this.directory.create(body, loggedIn());
  }
}

export class FakeListAuthorizationsService
  extends FakeAuthorizationService<ListAuthorizationsParams>
  implements IListAuthorizationsService
{
  async exec(params: ListAuthorizationsParams): Promise<Page<Autorizacao>> {
    this.record(params);
    return this.directory.list(params);
  }
}

export class FakeListMyAuthorizationsService
  extends FakeAuthorizationService<ListMyAuthorizationsParams>
  implements IListMyAuthorizationsService
{
  async exec(params: ListMyAuthorizationsParams): Promise<Page<Autorizacao>> {
    this.record(params);
    return this.directory.listMine(loggedIn().id, params);
  }
}

export class FakeGetAuthorizationService
  extends FakeAuthorizationService<string>
  implements IGetAuthorizationService
{
  async exec(id: string): Promise<Autorizacao> {
    this.record(id);
    return this.directory.get(id);
  }
}

export class FakeCancelAuthorizationService
  extends FakeAuthorizationService<{ id: string; motivo?: string }>
  implements ICancelAuthorizationService
{
  async exec(id: string, motivo?: string): Promise<Autorizacao> {
    this.record({ id, motivo });
    return this.directory.cancel(id, motivo, loggedIn());
  }
}
