import type {
  ChaveDoTerminal,
  CreateAccessPointBody,
  CreateBuildingBody,
  CreateTerminalBody,
  Edificio,
  ListParams,
  PontoDeAcesso,
  Terminal,
  UpdateAccessPointBody,
  UpdateBuildingBody,
  UpdateTerminalBody,
} from '@/lib/types/locations';
import type { Page } from '@/lib/types/page';
import type { ApiError } from '../ApiError';
import type {
  ICreateAccessPointService,
  ICreateBuildingService,
  IListAccessPointsService,
  IListBuildingsService,
  IUpdateAccessPointService,
  IUpdateBuildingService,
} from '../ILocationService';
import type {
  ICreateTerminalService,
  IGetTerminalService,
  IListTerminalsService,
  IRotateTerminalKeyService,
  IUpdateTerminalService,
} from '../ITerminalService';
import { FakeLocationDirectory } from './FakeLocationDirectory';

// One directory for the whole app in fake mode, so a new building shows up in the list.
const sharedDirectory = new FakeLocationDirectory();

/**
 * Records each call in `calls`; willFail makes every next call fail with the given error
 * (null goes back to answering from the directory).
 */
abstract class FakeLocationService<Call> {
  readonly calls: Call[] = [];
  private failure: ApiError | null = null;

  constructor(protected readonly directory: FakeLocationDirectory = sharedDirectory) {}

  willFail(error: ApiError | null) {
    this.failure = error;
  }

  protected record(call: Call) {
    this.calls.push(call);
    if (this.failure) throw this.failure;
  }
}

export class FakeListBuildingsService
  extends FakeLocationService<ListParams>
  implements IListBuildingsService
{
  async exec(params: ListParams): Promise<Page<Edificio>> {
    this.record(params);
    return this.directory.listBuildings(params);
  }
}

export class FakeCreateBuildingService
  extends FakeLocationService<CreateBuildingBody>
  implements ICreateBuildingService
{
  async exec(body: CreateBuildingBody): Promise<Edificio> {
    this.record(body);
    return this.directory.createBuilding(body);
  }
}

export class FakeUpdateBuildingService
  extends FakeLocationService<{ id: string; body: UpdateBuildingBody }>
  implements IUpdateBuildingService
{
  async exec(id: string, body: UpdateBuildingBody): Promise<Edificio> {
    this.record({ id, body });
    return this.directory.updateBuilding(id, body);
  }
}

export class FakeListAccessPointsService
  extends FakeLocationService<ListParams>
  implements IListAccessPointsService
{
  async exec(params: ListParams): Promise<Page<PontoDeAcesso>> {
    this.record(params);
    return this.directory.listAccessPoints(params);
  }
}

export class FakeCreateAccessPointService
  extends FakeLocationService<CreateAccessPointBody>
  implements ICreateAccessPointService
{
  async exec(body: CreateAccessPointBody): Promise<PontoDeAcesso> {
    this.record(body);
    return this.directory.createAccessPoint(body);
  }
}

export class FakeUpdateAccessPointService
  extends FakeLocationService<{ id: string; body: UpdateAccessPointBody }>
  implements IUpdateAccessPointService
{
  async exec(id: string, body: UpdateAccessPointBody): Promise<PontoDeAcesso> {
    this.record({ id, body });
    return this.directory.updateAccessPoint(id, body);
  }
}

export class FakeListTerminalsService
  extends FakeLocationService<ListParams>
  implements IListTerminalsService
{
  async exec(params: ListParams): Promise<Page<Terminal>> {
    this.record(params);
    return this.directory.listTerminals(params);
  }
}

export class FakeGetTerminalService
  extends FakeLocationService<string>
  implements IGetTerminalService
{
  async exec(id: string): Promise<Terminal> {
    this.record(id);
    return this.directory.getTerminal(id);
  }
}

export class FakeCreateTerminalService
  extends FakeLocationService<CreateTerminalBody>
  implements ICreateTerminalService
{
  async exec(body: CreateTerminalBody): Promise<ChaveDoTerminal> {
    this.record(body);
    return this.directory.createTerminal(body);
  }
}

export class FakeUpdateTerminalService
  extends FakeLocationService<{ id: string; body: UpdateTerminalBody }>
  implements IUpdateTerminalService
{
  async exec(id: string, body: UpdateTerminalBody): Promise<Terminal> {
    this.record({ id, body });
    return this.directory.updateTerminal(id, body);
  }
}

export class FakeRotateTerminalKeyService
  extends FakeLocationService<string>
  implements IRotateTerminalKeyService
{
  async exec(id: string): Promise<ChaveDoTerminal> {
    this.record(id);
    return this.directory.rotateKey(id);
  }
}
