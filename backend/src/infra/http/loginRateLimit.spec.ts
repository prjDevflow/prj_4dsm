import { describe, expect, it } from 'vitest';
import { makeLoginKey } from './loginRateLimit';

describe('makeLoginKey', () => {
  it('deve juntar o IP e o e-mail em minúsculas, sem espaços nas pontas', () => {
    expect(makeLoginKey('203.0.113.7', '  Maria@Teste.COM ')).toBe('203.0.113.7|maria@teste.com');
  });

  it('deve usar só o IP quando o e-mail não é texto', () => {
    expect(makeLoginKey('203.0.113.7', undefined)).toBe('203.0.113.7|');
    expect(makeLoginKey('203.0.113.7', { $ne: 'x' })).toBe('203.0.113.7|');
  });

  it('deve limitar o e-mail da chave a 254 caracteres, para um corpo grande não ocupar a memória do limitador', () => {
    const key = makeLoginKey('203.0.113.7', 'a'.repeat(100_000));

    expect(key).toBe(`203.0.113.7|${'a'.repeat(254)}`);
  });

  it('deve tratar e-mails que só diferem depois do caractere 254 como o mesmo contador', () => {
    const base = 'a'.repeat(254);

    expect(makeLoginKey('203.0.113.7', `${base}x`)).toBe(makeLoginKey('203.0.113.7', `${base}y`));
  });
});
