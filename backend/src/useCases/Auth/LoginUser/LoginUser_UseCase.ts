import type { UserProfile } from '../../../entities/User';
import type { IHashProvider } from '../../../providers/IHashProvider';
import type { ITokenProvider } from '../../../providers/ITokenProvider';
import type { IUserRepository } from '../../../repositories/IUserRepository';
import { InvalidCredentialsError } from '../authErrors';
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

  async execute(input: ILoginUserDTO): Promise<LoginUserResult> {
    const user = await this.users.findByEmail(input.email.trim().toLowerCase());
    if (!user || !(await this.hash.compare(input.senha, user.senhaHash))) {
      throw new InvalidCredentialsError();
    }

    const accessToken = this.tokens.sign({ sub: user.id, perfil: user.perfil });
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.config.expiresInSeconds,
      usuario: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil },
    };
  }
}
