export interface ISecureRandom {
  /** `bytes` cryptographically random bytes, as base64url without padding. */
  base64Url(bytes: number): string;
}
