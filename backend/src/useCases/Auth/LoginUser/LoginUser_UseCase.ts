import type { UserProfile } from '../../../entities/User';
import type { IHashProvider } from '../../../providers/IHashProvider';
import type { ITokenProvider } from '../../../providers/ITokenProvider';
import type { IUserRepository } from '../../../repositories/IUserRepository';
import { InactiveUserError, InvalidCredentialsError } from '../authErrors';
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

  private dummyHash?: Promise<string>;

  async execute(input: ILoginUserDTO): Promise<LoginUserResult> {
    const user = await this.users.findByEmail(input.email.trim().toLowerCase());

    // An unknown e-mail still pays for one comparison, so response time does not reveal it.
    const hashToCompare = user?.senhaHash ?? (await this.getDummyHash());
    const passwordMatches = await this.hash.compare(input.senha, hashToCompare);

    if (!user || !passwordMatches) throw new InvalidCredentialsError();
    // Only after the password: an inactive account must not be discoverable without it.
    if (!user.ativo) throw new InactiveUserError();

    const accessToken = this.tokens.sign({ sub: user.id, perfil: user.perfil });
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.config.expiresInSeconds,
      usuario: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil },
    };
  }

  private getDummyHash() {
    this.dummyHash ??= this.hash.hash('senha-descartavel').catch((error: unknown) => {
      // Do not keep a rejected promise: every later unknown-e-mail login would fail with it.
      this.dummyHash = undefined;
      throw error;
    });
    return this.dummyHash;
  }
}
