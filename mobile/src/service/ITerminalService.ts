import type {
  ChaveDoTerminal,
  CreateTerminalBody,
  ListParams,
  Terminal,
  UpdateTerminalBody,
} from '@/lib/types/locations';
import type { Page } from '@/lib/types/page';

export interface IListTerminalsService {
  exec: (params: ListParams) => Promise<Page<Terminal>>;
}

export interface IGetTerminalService {
  exec: (id: string) => Promise<Terminal>;
}

/** The answer carries the key: never put it in the query cache or in a log. */
export interface ICreateTerminalService {
  exec: (body: CreateTerminalBody) => Promise<ChaveDoTerminal>;
}

export interface IUpdateTerminalService {
  exec: (id: string, body: UpdateTerminalBody) => Promise<Terminal>;
}

/** The answer carries the new key: never put it in the query cache or in a log. */
export interface IRotateTerminalKeyService {
  exec: (id: string) => Promise<ChaveDoTerminal>;
}
