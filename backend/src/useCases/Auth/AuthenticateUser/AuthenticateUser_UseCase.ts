import type { UserProfile } from '../../../entities/User';
import type { ITokenProvider } from '../../../providers/ITokenProvider';
import type { IUserRepository } from '../../../repositories/IUserRepository';

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

  async execute(_input: AuthenticateUserInput): Promise<AuthenticatedUser> {
    throw new Error('não implementado');
  }
}
