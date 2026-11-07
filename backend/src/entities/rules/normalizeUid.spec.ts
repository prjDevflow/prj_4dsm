import { describe, expect, it } from 'vitest';
import { normalizeUid } from './normalizeUid';

describe('normalizeUid', () => {
  it('deve dar o mesmo UID para 04:a1:b2:c3 e 04A1B2C3', () => {
    expect(normalizeUid('04:a1:b2:c3')).toBe('04A1B2C3');
    expect(normalizeUid('04A1B2C3')).toBe('04A1B2C3');
  });

  it.todo('deve remover hífens e espaços e converter para maiúsculas');
  it.todo('deve aceitar 8 e 20 caracteres');
  it.todo('deve rejeitar 7 e 21 caracteres');
  it.todo('deve rejeitar caractere que não é hexadecimal');
  it.todo('deve rejeitar texto vazio ou só de separadores');
});
