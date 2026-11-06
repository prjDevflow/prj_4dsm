import { createHash, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { IHashProvider } from '../../providers/IHashProvider';

export class BcryptHashProvider implements IHashProvider {
  constructor(private cost: number) {}

  hash(plain: string) {
    return bcrypt.hash(plain, this.cost);
  }

  async compare(plain: string, hash: string) {
    try {
      return await bcrypt.compare(plain, hash);
    } catch {
      // A malformed stored hash must read as "does not match", not as a server error.
      return false;
    }
  }

  sha256(text: string) {
    return createHash('sha256').update(text).digest('hex');
  }

  sha256Matches(plain: string, hexHash: string) {
    const expected = Buffer.from(this.sha256(plain));
    const given = Buffer.from(hexHash);
    // timingSafeEqual throws on different lengths, which here simply means "no match".
    return expected.length === given.length && timingSafeEqual(expected, given);
  }
}
