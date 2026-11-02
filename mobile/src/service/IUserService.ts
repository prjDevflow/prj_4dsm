import type { Page } from '@/lib/types/page';
import type {
  CreateUserBody,
  ListUsersParams,
  UpdateUserBody,
  UsuarioCompleto,
} from '@/lib/types/users';

export interface IListUsersService {
  exec: (params: ListUsersParams) => Promise<Page<UsuarioCompleto>>;
}

export interface IGetUserService {
  exec: (id: string) => Promise<UsuarioCompleto>;
}

export interface ICreateUserService {
  exec: (body: CreateUserBody) => Promise<UsuarioCompleto>;
}

export interface IUpdateUserService {
  exec: (id: string, body: UpdateUserBody) => Promise<UsuarioCompleto>;
}
