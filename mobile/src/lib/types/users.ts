import type { Perfil, Usuario } from './auth';

// UsuarioCompleto of backend/openapi.yaml: what /users returns (never the password).
export interface UsuarioCompleto extends Usuario {
  ativo: boolean;
  criadoEm: string;
}

// GET /users: the filters left undefined are not sent.
export interface ListUsersParams {
  perfil?: Perfil;
  ativo?: boolean;
  q?: string;
  page: number;
  pageSize: number;
}

// POST /users
export interface CreateUserBody {
  nome: string;
  email: string;
  perfil: Perfil;
  senha: string;
}

// PATCH /users/:id: only what changed, and never the e-mail (the API answers 422).
export type UpdateUserBody = Partial<{
  nome: string;
  perfil: Perfil;
  ativo: boolean;
  senha: string;
}>;
