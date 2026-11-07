import type {
  ChaveDoTerminal,
  CreateTerminalBody,
  ListParams,
  Terminal,
  UpdateTerminalBody,
} from '@/lib/types/locations';
import type { Page } from '@/lib/types/page';
import { AxiosInstance } from '../AxiosInstance';
import type {
  ICreateTerminalService,
  IGetTerminalService,
  IListTerminalsService,
  IRotateTerminalKeyService,
  IUpdateTerminalService,
} from '../ITerminalService';

// /terminals (B07, B11). The key comes only in the create and rotate-key answers.

const terminalPath = (id: string) => `/terminals/${encodeURIComponent(id)}`;

export class ListTerminalsService implements IListTerminalsService {
  async exec(params: ListParams): Promise<Page<Terminal>> {
    const { data } = await AxiosInstance.get<Page<Terminal>>('/terminals', { params });
    return data;
  }
}

export class GetTerminalService implements IGetTerminalService {
  async exec(id: string): Promise<Terminal> {
    const { data } = await AxiosInstance.get<Terminal>(terminalPath(id));
    return data;
  }
}

export class CreateTerminalService implements ICreateTerminalService {
  async exec(body: CreateTerminalBody): Promise<ChaveDoTerminal> {
    const { data } = await AxiosInstance.post<ChaveDoTerminal>('/terminals', body);
    return data;
  }
}

export class UpdateTerminalService implements IUpdateTerminalService {
  async exec(id: string, body: UpdateTerminalBody): Promise<Terminal> {
    const { data } = await AxiosInstance.patch<Terminal>(terminalPath(id), body);
    return data;
  }
}

/** The old key stops working at once. */
export class RotateTerminalKeyService implements IRotateTerminalKeyService {
  async exec(id: string): Promise<ChaveDoTerminal> {
    const { data } = await AxiosInstance.post<ChaveDoTerminal>(`${terminalPath(id)}/rotate-key`);
    return data;
  }
}
