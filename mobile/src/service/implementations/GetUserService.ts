import type { UsuarioCompleto } from '@/lib/types/users';
import { AxiosInstance } from '../AxiosInstance';
import type { IGetUserService } from '../IUserService';

export class GetUserService implements IGetUserService {
  async exec(id: string): Promise<UsuarioCompleto> {
    const { data } = await AxiosInstance.get<UsuarioCompleto>(`/users/${encodeURIComponent(id)}`);
    return data;
  }
}
