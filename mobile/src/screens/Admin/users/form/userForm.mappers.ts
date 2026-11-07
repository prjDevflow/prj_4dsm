import type { CreateUserBody, UpdateUserBody, UsuarioCompleto } from '@/lib/types/users';
import type { UserFormOutput } from './userForm.schema';

/** The saved user in the edit form; the password fields start empty. */
export const toFormValues = (user: UsuarioCompleto): UserFormOutput => ({
  nome: user.nome,
  email: user.email,
  perfil: user.perfil,
  senha: '',
  confirmarSenha: '',
  ativo: user.ativo,
});

export const toCreateBody = ({ nome, email, perfil, senha }: UserFormOutput): CreateUserBody => ({
  nome,
  email: email.toLowerCase(),
  perfil,
  senha,
});

/** PATCH body: only what changed, never the e-mail, and the password only when typed. */
export const changedFields = (user: UsuarioCompleto, values: UserFormOutput): UpdateUserBody => {
  const body: UpdateUserBody = {};
  if (values.nome !== user.nome) body.nome = values.nome;
  if (values.perfil !== user.perfil) body.perfil = values.perfil;
  if (values.ativo !== user.ativo) body.ativo = values.ativo;
  if (values.senha) body.senha = values.senha;
  return body;
};
