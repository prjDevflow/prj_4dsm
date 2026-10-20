import type { UserProfile } from '../entities/User';

export interface TokenPayload {
  /** User id. */
  sub: string;
  perfil: UserProfile;
}

export interface ITokenProvider {
  sign(payload: TokenPayload): string;
  /** An invalid, tampered or expired token is a value (null), not an exception. */
  verify(token: string): TokenPayload | null;
}
