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
}
