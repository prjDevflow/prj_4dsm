export interface IHashProvider {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
  /** SHA-256 in lower-case hexadecimal. For high-entropy secrets (terminal keys), never for passwords. */
  sha256(text: string): string;
  /** True when `hexHash` is the SHA-256 of `plain`; compares in constant time. */
  sha256Matches(plain: string, hexHash: string): boolean;
}
