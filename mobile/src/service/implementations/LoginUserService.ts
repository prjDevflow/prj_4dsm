import type { LoginResponse } from '@/lib/types/auth';
import { AxiosInstance } from '../AxiosInstance';
import type { ILoginUserService } from '../IAuthService';

export class LoginUserService implements ILoginUserService {
  async exec(email: string, senha: string): Promise<LoginResponse> {
    const { data } = await AxiosInstance.post<LoginResponse>('/auth/login', { email, senha });
    return data;
  }
}
