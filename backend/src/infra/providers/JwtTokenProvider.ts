import type { ITokenProvider, TokenPayload } from '../../providers/ITokenProvider';
import type { IClock } from '../../providers/IClock';

export class JwtTokenProvider implements ITokenProvider {
  constructor(
    private secret: string,
    private expiresInSeconds: number,
    private clock: IClock,
  ) {}

  sign(_payload: TokenPayload): string {
    throw new Error('não implementado');
  }

  verify(_token: string): TokenPayload | null {
    throw new Error('não implementado');
  }
}
