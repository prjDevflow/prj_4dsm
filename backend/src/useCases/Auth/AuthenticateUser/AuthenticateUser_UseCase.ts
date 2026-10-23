import type { UserProfile } from '../../../entities/User';
import type { ITokenProvider } from '../../../providers/ITokenProvider';
import type { IUserRepository } from '../../../repositories/IUserRepository';
import { InvalidSessionError } from '../authErrors';

export interface AuthenticateUserInput {
  token: string | undefined;
  /** B15 lets inactive accounts through so their attempt can be recorded as an event. */
  allowInactive?: boolean;
}

export interface AuthenticatedUser {
  userId: string;
  perfil: UserProfile;
}

export class AuthenticateUserUseCase {
  constructor(
    private users: IUserRepository,
    private tokens: ITokenProvider,
  ) {}

  async execute({
    token,
    allowInactive = false,
  }: AuthenticateUserInput): Promise<AuthenticatedUser> {
    const payload = token ? this.tokens.verify(token) : null;
    if (!payload) throw new InvalidSessionError();

    // The profile comes from the database, so a role change applies without a new login.
    const user = await this.users.findById(payload.sub);
    if (!user || (!user.ativo && !allowInactive)) {
      throw new InvalidSessionError();
    }

    return { userId: user.id, perfil: user.perfil };
  }
}
