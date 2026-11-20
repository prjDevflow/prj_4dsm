import type { UpdateUserBody, UsuarioCompleto } from '@/lib/types/users';
import { AxiosInstance } from '../AxiosInstance';
import type { IUpdateUserService } from '../IUserService';

// Deactivating is `ativo: false` (there is no DELETE).
export class UpdateUserService implements IUpdateUserService {
  async exec(id: string, body: UpdateUserBody): Promise<UsuarioCompleto> {
    const { data } = await AxiosInstance.patch<UsuarioCompleto>(
      `/users/${encodeURIComponent(id)}`,
      body,
    );
    return data;
  }
}
