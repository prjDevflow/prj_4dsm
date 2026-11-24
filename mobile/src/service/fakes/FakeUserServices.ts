import { useSessionStore } from '@/context/SessionStore';
import type { Page } from '@/lib/types/page';
import type {
  CreateUserBody,
  ListUsersParams,
  UpdateUserBody,
  UsuarioCompleto,
} from '@/lib/types/users';
import type { ApiError } from '../ApiError';
import type {
  ICreateUserService,
  IGetUserService,
  IListUsersService,
  IUpdateUserService,
} from '../IUserService';
import { FakeUserDirectory } from './FakeUserDirectory';

// One directory for the whole app in fake mode, so a created user shows up in the list.
export const sharedUserDirectory = new FakeUserDirectory();

/**
 * Records each call in `calls`; willFail makes every next call fail with the given error
 * (null goes back to answering from the directory).
 */
abstract class FakeUserService<Call> {
  readonly calls: Call[] = [];
  private failure: ApiError | null = null;

  constructor(protected readonly directory: FakeUserDirectory = sharedUserDirectory) {}

  willFail(error: ApiError | null) {
    this.failure = error;
  }

  protected record(call: Call) {
    this.calls.push(call);
    if (this.failure) throw this.failure;
  }
}

export class FakeListUsersService
  extends FakeUserService<ListUsersParams>
  implements IListUsersService
{
  async exec(params: ListUsersParams): Promise<Page<UsuarioCompleto>> {
    this.record(params);
    return this.directory.list(params);
  }
}

export class FakeGetUserService extends FakeUserService<string> implements IGetUserService {
  async exec(id: string): Promise<UsuarioCompleto> {
    this.record(id);
    return this.directory.get(id);
  }
}

export class FakeCreateUserService
  extends FakeUserService<CreateUserBody>
  implements ICreateUserService
{
  async exec(body: CreateUserBody): Promise<UsuarioCompleto> {
    this.record(body);
    return this.directory.create(body);
  }
}

export class FakeUpdateUserService
  extends FakeUserService<{ id: string; body: UpdateUserBody }>
  implements IUpdateUserService
{
  async exec(id: string, body: UpdateUserBody): Promise<UsuarioCompleto> {
    this.record({ id, body });
    // Like the server, the rules use the logged-in administrator.
    return this.directory.update(id, body, useSessionStore.getState().usuario?.id);
  }
}
