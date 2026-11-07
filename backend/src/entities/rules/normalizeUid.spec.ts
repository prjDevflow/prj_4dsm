import { describe, expect, it } from 'vitest';
import { normalizeUid } from './normalizeUid';

describe('normalizeUid', () => {
  it('deve dar o mesmo UID para 04:a1:b2:c3 e 04A1B2C3', () => {
    expect(normalizeUid('04:a1:b2:c3')).toBe('04A1B2C3');
    expect(normalizeUid('04A1B2C3')).toBe('04A1B2C3');
  });

  it('deve remover hífens e espaços e converter para maiúsculas', () => {
    expect(normalizeUid('04-a1-b2-c3')).toBe('04A1B2C3');
    expect(normalizeUid('04 a1 b2 c3')).toBe('04A1B2C3');
    expect(normalizeUid('  04:A1-b2 c3  ')).toBe('04A1B2C3');
  });

  it('deve aceitar 8 e 20 caracteres', () => {
    expect(normalizeUid('04A1B2C3')).toBe('04A1B2C3');
    expect(normalizeUid('04A1B2C3D4E5F60718AB')).toBe('04A1B2C3D4E5F60718AB');
  });

  it('deve rejeitar 7 caracteres', () => {
    expect(normalizeUid('04A1B2C')).toBeNull();
  });

  it('deve rejeitar 21 caracteres', () => {
    expect(normalizeUid('04A1B2C3D4E5F60718AB1')).toBeNull();
  });

  it('deve contar os caracteres depois de tirar os separadores', () => {
    expect(normalizeUid('04:A1:B2:C')).toBeNull();
    expect(normalizeUid('04:A1:B2:C3:D4:E5:F6:07:18:AB')).toBe('04A1B2C3D4E5F60718AB');
    expect(normalizeUid('04:A1:B2:C3:D4:E5:F6:07:18:AB:1')).toBeNull();
  });

  it('deve rejeitar caractere que não é hexadecimal', () => {
    expect(normalizeUid('04A1B2CZ')).toBeNull();
    expect(normalizeUid('04A1B2C_')).toBeNull();
    expect(normalizeUid('04A1B2C3é')).toBeNull();
  });

  it('deve rejeitar texto vazio ou só de separadores', () => {
    expect(normalizeUid('')).toBeNull();
    expect(normalizeUid(' : - ')).toBeNull();
  });
});
