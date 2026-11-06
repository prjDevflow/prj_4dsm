import { describe, expect, it } from 'vitest';
import { normalizeUid } from './normalizeUid';

describe('normalizeUid', () => {
  it.each(['04:a1:b2:c3', '04A1B2C3'])('deve resultar em 04A1B2C3 para "%s"', (raw) => {
    expect(normalizeUid(raw)).toBe('04A1B2C3');
  });

  it.each(['04-a1-b2-c3', '04 a1 b2 c3', ' 04a1b2c3\n'])(
    'deve remover hífens e espaços em %j',
    (raw) => {
      expect(normalizeUid(raw)).toBe('04A1B2C3');
    },
  );

  it('deve contar o tamanho depois de remover os separadores', () => {
    expect(normalizeUid('04:A1:B2:C')).toBeNull();
  });

  it.each(['04A1B2G3', '04A1B2C\0', ''])(
    'deve devolver null com caractere não hexadecimal ou sem caracteres em %j',
    (raw) => {
      expect(normalizeUid(raw)).toBeNull();
    },
  );

  it('deve devolver null quando o caractere só vira hexadecimal ao passar para maiúscula', () => {
    // 'ﬀ' (a single ligature character) becomes 'FF' in upper case.
    expect(normalizeUid('04a1b2ﬀ')).toBeNull();
  });

  it('deve devolver null com 7 e com 21 caracteres', () => {
    expect(normalizeUid('A'.repeat(7))).toBeNull();
    expect(normalizeUid('A'.repeat(21))).toBeNull();
  });

  it('deve aceitar 8 e 20 caracteres', () => {
    expect(normalizeUid('A'.repeat(8))).toBe('A'.repeat(8));
    expect(normalizeUid('A'.repeat(20))).toBe('A'.repeat(20));
  });
});
