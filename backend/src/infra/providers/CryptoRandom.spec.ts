import { describe, expect, it } from 'vitest';
import { CryptoRandom } from './CryptoRandom';

describe('CryptoRandom', () => {
  it('deve gerar base64url sem preenchimento com o tamanho certo para 32 bytes', () => {
    const value = new CryptoRandom().base64Url(32);

    expect(value).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('deve gerar um valor diferente a cada chamada', () => {
    const random = new CryptoRandom();

    expect(random.base64Url(32)).not.toBe(random.base64Url(32));
  });
});
