import { randomBytes } from 'node:crypto';
import type { ISecureRandom } from '../../providers/ISecureRandom';

export class CryptoRandom implements ISecureRandom {
  base64Url(bytes: number) {
    return randomBytes(bytes).toString('base64url');
  }
}
