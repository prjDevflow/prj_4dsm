import type { User, UserProfile } from '../../entities/User';

/** The user as the API exposes it: never the password hash. */
export interface UserView {
  id: string;
  nome: string;
  email: string;
  perfil: UserProfile;
  ativo: boolean;
  criadoEm: Date;
}

export const toUserView = (user: User): UserView => ({
  id: user.id,
  nome: user.nome,
  email: user.email,
  perfil: user.perfil,
  ativo: user.ativo,
  criadoEm: user.criadoEm,
});
