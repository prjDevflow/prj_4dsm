import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { makeLoginKey, makeLoginRateLimit } from './loginRateLimit';

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

describe('makeLoginRateLimit', () => {
  it('deve criar o limitador sem o aviso ERR_ERL_KEY_GEN_IPV6 do express-rate-limit', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    makeLoginRateLimit(5);

    const text = logged.mock.calls.map((call) => String(call[0])).join('\n');
    logged.mockRestore();
    expect(text).not.toContain('ERR_ERL_KEY_GEN_IPV6');
  });

  it('deve contar juntos os endereços IPv6 do mesmo bloco /56, para trocar de endereço não escapar do limite', async () => {
    const app = express();
    app.set('trust proxy', true);
    app.use(express.json());
    app.post('/login', makeLoginRateLimit(1), (_req, res) => {
      res.sendStatus(200);
    });
    const login = (ip: string) =>
      request(app).post('/login').set('X-Forwarded-For', ip).send({ email: 'a@b.com' });

    const first = await login('2001:db8:abcd:12ff::1');
    const sameBlock = await login('2001:db8:abcd:12ee::9999');
    const otherBlock = await login('2001:db8:abcd:13ff::1');

    expect(first.status).toBe(200);
    expect(sameBlock.status).toBe(429);
    expect(otherBlock.status).toBe(200);
  });
});
