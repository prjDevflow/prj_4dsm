import type { Autorizacao, CreateAuthorizationBody } from '@/lib/types/authorizations';

export interface ICreateAuthorizationService {
  exec: (body: CreateAuthorizationBody) => Promise<Autorizacao>;
}
