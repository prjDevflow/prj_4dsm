export type Perfil = 'ADMIN' | 'CONDOMINO' | 'VISITANTE';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
}

// POST /auth/login → 200
export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  usuario: Usuario;
}
