import type {
  Autorizacao,
  CreateAuthorizationBody,
  ListAuthorizationsParams,
} from '@/lib/types/authorizations';
import type { Page } from '@/lib/types/page';

export interface ICreateAuthorizationService {
  exec: (body: CreateAuthorizationBody) => Promise<Autorizacao>;
}

export interface IListAuthorizationsService {
  exec: (params: ListAuthorizationsParams) => Promise<Page<Autorizacao>>;
}

export interface IGetAuthorizationService {
  exec: (id: string) => Promise<Autorizacao>;
}

/** Idempotent: cancelling again answers 200 with the state as it is. */
export interface ICancelAuthorizationService {
  exec: (id: string, motivo?: string) => Promise<Autorizacao>;
}
