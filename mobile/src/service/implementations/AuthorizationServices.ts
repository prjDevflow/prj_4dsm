import type { Autorizacao, CreateAuthorizationBody } from '@/lib/types/authorizations';
import { AxiosInstance } from '../AxiosInstance';
import type { ICreateAuthorizationService } from '../IAuthorizationService';

// /authorizations (B08). The authorization is always born ATIVA; there is no state to send.

export class CreateAuthorizationService implements ICreateAuthorizationService {
  async exec(body: CreateAuthorizationBody): Promise<Autorizacao> {
    const { data } = await AxiosInstance.post<Autorizacao>('/authorizations', body);
    return data;
  }
}
