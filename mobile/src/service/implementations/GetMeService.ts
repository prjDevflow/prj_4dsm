import type { Usuario } from '@/lib/types/auth';
import { AxiosInstance } from '../AxiosInstance';
import type { IGetMeService } from '../IAuthService';

// The server reloads the user from the database on every call (profile and active status).
export class GetMeService implements IGetMeService {
  async exec(): Promise<Usuario> {
    const { data } = await AxiosInstance.get<Usuario>('/auth/me');
    return data;
  }
}
