import type { IHashProvider } from '../../src/providers/IHashProvider';

export class FakeHashProvider implements IHashProvider {
  compareCalls = 0;

  async hash(plain: string) {
    return `hashed:${plain}`;
  }

  async compare(plain: string, hash: string) {
    this.compareCalls += 1;
    return hash === `hashed:${plain}`;
  }
}
