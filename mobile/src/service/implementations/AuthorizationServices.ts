import type {
  Autorizacao,
  CreateAuthorizationBody,
  ListAuthorizationsParams,
} from '@/lib/types/authorizations';
import type { Page } from '@/lib/types/page';
import { AxiosInstance } from '../AxiosInstance';
import type {
  ICancelAuthorizationService,
  ICreateAuthorizationService,
  IGetAuthorizationService,
  IListAuthorizationsService,
} from '../IAuthorizationService';

// /authorizations (B08, B09). The authorization is always born ATIVA; there is no state to send.

const authorizationPath = (id: string) => `/authorizations/${encodeURIComponent(id)}`;

export class CreateAuthorizationService implements ICreateAuthorizationService {
  async exec(body: CreateAuthorizationBody): Promise<Autorizacao> {
    const { data } = await AxiosInstance.post<Autorizacao>('/authorizations', body);
    return data;
  }
}

// Most recent first on the server; axios leaves out the filters that are undefined.
export class ListAuthorizationsService implements IListAuthorizationsService {
  async exec(params: ListAuthorizationsParams): Promise<Page<Autorizacao>> {
    const { data } = await AxiosInstance.get<Page<Autorizacao>>('/authorizations', { params });
    return data;
  }
}

export class GetAuthorizationService implements IGetAuthorizationService {
  async exec(id: string): Promise<Autorizacao> {
    const { data } = await AxiosInstance.get<Autorizacao>(authorizationPath(id));
    return data;
  }
}

export class CancelAuthorizationService implements ICancelAuthorizationService {
  async exec(id: string, motivo?: string): Promise<Autorizacao> {
    const { data } = await AxiosInstance.patch<Autorizacao>(
      `${authorizationPath(id)}/cancel`,
      motivo ? { motivo } : {},
    );
    return data;
  }
}
