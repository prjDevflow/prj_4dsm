import type { UserProfile } from '../../../entities/User';
import type { IHashProvider } from '../../../providers/IHashProvider';
import type { ITokenProvider } from '../../../providers/ITokenProvider';
import type { IUserRepository } from '../../../repositories/IUserRepository';
import type { ILoginUserDTO } from './LoginUser_DTO';

export interface LoginUserConfig {
  expiresInSeconds: number;
}

export interface LoginUserResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  usuario: { id: string; nome: string; email: string; perfil: UserProfile };
}

export class LoginUserUseCase {
  constructor(
    private users: IUserRepository,
    private hash: IHashProvider,
    private tokens: ITokenProvider,
    private config: LoginUserConfig,
  ) {}

  async execute(_input: ILoginUserDTO): Promise<LoginUserResult> {
    throw new Error('não implementado');
  }
}
