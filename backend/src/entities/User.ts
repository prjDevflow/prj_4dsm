export type UserProfile = 'ADMIN' | 'CONDOMINO' | 'VISITANTE';

export interface User {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  perfil: UserProfile;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}
