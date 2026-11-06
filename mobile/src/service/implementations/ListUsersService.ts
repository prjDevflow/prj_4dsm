import type { Page } from '@/lib/types/page';
import type { ListUsersParams, UsuarioCompleto } from '@/lib/types/users';
import { AxiosInstance } from '../AxiosInstance';
import type { IListUsersService } from '../IUserService';

// Sorted by name on the server; axios leaves out the filters that are undefined.
export class ListUsersService implements IListUsersService {
  async exec(params: ListUsersParams): Promise<Page<UsuarioCompleto>> {
    const { data } = await AxiosInstance.get<Page<UsuarioCompleto>>('/users', { params });
    return data;
  }
}
