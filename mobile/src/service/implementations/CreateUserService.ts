import type { CreateUserBody, UsuarioCompleto } from '@/lib/types/users';
import { AxiosInstance } from '../AxiosInstance';
import type { ICreateUserService } from '../IUserService';

export class CreateUserService implements ICreateUserService {
  async exec(body: CreateUserBody): Promise<UsuarioCompleto> {
    const { data } = await AxiosInstance.post<UsuarioCompleto>('/users', body);
    return data;
  }
}
