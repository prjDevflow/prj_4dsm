import type { LoginResponse, Usuario } from '@/lib/types/auth';

export interface ILoginUserService {
  exec: (email: string, senha: string) => Promise<LoginResponse>;
}

export interface IGetMeService {
  exec: () => Promise<Usuario>;
}
