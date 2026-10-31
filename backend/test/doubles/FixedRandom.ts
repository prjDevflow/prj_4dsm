import type { ISecureRandom } from '../../src/providers/ISecureRandom';

/** Predictable values: key-1, key-2 and so on, so a test can tell the generated secrets apart. */
export class FixedRandom implements ISecureRandom {
  private count = 0;
  /** The size asked in the last call. */
  lastBytes = 0;

  base64Url(bytes: number) {
    this.lastBytes = bytes;
    this.count += 1;
    return `key-${this.count}`;
  }
}
