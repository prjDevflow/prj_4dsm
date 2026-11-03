import type { ISecureRandom } from '../../src/providers/ISecureRandom';

/**
 * Predictable values: key-1, key-2 and so on, so a test can tell the generated secrets apart. Pass
 * `values` to hand out specific ones first (for example a token with the real size).
 */
export class FixedRandom implements ISecureRandom {
  private count = 0;
  /** The size asked in the last call. */
  lastBytes = 0;

  constructor(private values: string[] = []) {}

  base64Url(bytes: number) {
    this.lastBytes = bytes;
    this.count += 1;
    return this.values[this.count - 1] ?? `key-${this.count}`;
  }
}
