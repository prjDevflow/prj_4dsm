import jwt from 'jsonwebtoken';
import type { IClock } from '../../providers/IClock';
import type { ITokenProvider, TokenPayload } from '../../providers/ITokenProvider';

const PROFILES = ['ADMIN', 'CONDOMINO', 'VISITANTE'];
// The algorithm is fixed on both sides, so a token cannot choose its own (for example "none").
const ALGORITHM = 'HS256';

export class JwtTokenProvider implements ITokenProvider {
  constructor(
    private secret: string,
    private expiresInSeconds: number,
    private clock: IClock,
  ) {}

  sign({ sub, perfil }: TokenPayload) {
    // iat comes from the injected clock; jsonwebtoken adds expiresInSeconds to it.
    const iat = Math.floor(this.clock.now().getTime() / 1000);
    return jwt.sign({ sub, perfil, iat }, this.secret, {
      algorithm: ALGORITHM,
      expiresIn: this.expiresInSeconds,
    });
  }

  verify(token: string): TokenPayload | null {
    try {
      const claims = jwt.verify(token, this.secret, {
        algorithms: [ALGORITHM],
        clockTimestamp: Math.floor(this.clock.now().getTime() / 1000),
      });
      if (typeof claims === 'string') return null;

      const { sub, perfil } = claims;
      if (typeof sub !== 'string' || !PROFILES.includes(perfil)) return null;
      return { sub, perfil };
    } catch {
      return null;
    }
  }
}
