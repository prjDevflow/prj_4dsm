import type { LoginResponse } from '@/lib/types/auth';

export interface ILoginUserService {
  exec: (email: string, senha: string) => Promise<LoginResponse>;
}
