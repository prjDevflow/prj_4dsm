export type Perfil = 'ADMIN' | 'CONDOMINO' | 'VISITANTE';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
}
