import type { ITokenProvider, TokenPayload } from '../../src/providers/ITokenProvider';

/** Only tokens it issued are valid, so a tampered or malformed token fails like a real one. */
export class FakeTokenProvider implements ITokenProvider {
  private issued = new Map<string, TokenPayload>();
  private counter = 0;

  sign(payload: TokenPayload) {
    this.counter += 1;
    const token = `fake-token-${this.counter}`;
    this.issued.set(token, { ...payload });
    return token;
  }

  verify(token: string) {
    const payload = this.issued.get(token);
    return payload ? { ...payload } : null;
  }

  /** Simulates the token passing its expiry time. */
  expire(token: string) {
    this.issued.delete(token);
  }
}
