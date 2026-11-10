import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';

// vitest.int.config.ts sets CORS_ORIGINS to this single origin.
const ALLOWED_ORIGIN = 'http://localhost:8081';
const OTHER_ORIGIN = 'https://site-de-fora.example';

describe('cabeçalhos de segurança (helmet)', () => {
  it('manda os cabeçalhos básicos em qualquer resposta e não anuncia o Express', async () => {
    const res = await request(createApp()).get('/api/v1/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers).not.toHaveProperty('x-powered-by');
  });

  it('manda os mesmos cabeçalhos numa resposta de erro', async () => {
    const res = await request(createApp()).get('/api/v1/nao-existe');

    expect(res.status).toBe(404);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('HSTS (HTTPS obrigatório)', () => {
  it('em produção manda Strict-Transport-Security por um ano, com os subdomínios', async () => {
    const res = await request(createApp({ isProduction: true })).get('/api/v1/health');

    expect(res.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
  });

  it('fora de produção não manda HSTS: o navegador não deve guardar a regra para o localhost', async () => {
    const res = await request(createApp({ isProduction: false })).get('/api/v1/health');

    expect(res.headers).not.toHaveProperty('strict-transport-security');
  });
});

describe('CORS', () => {
  it('libera a origem que está na lista', async () => {
    const res = await request(createApp()).get('/api/v1/health').set('Origin', ALLOWED_ORIGIN);

    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
  });

  it('não libera uma origem de fora da lista, e a resposta não vira "*"', async () => {
    const res = await request(createApp()).get('/api/v1/health').set('Origin', OTHER_ORIGIN);

    expect(res.headers).not.toHaveProperty('access-control-allow-origin');
  });

  it('não libera o preflight de uma origem de fora', async () => {
    const res = await request(createApp())
      .options('/api/v1/users')
      .set('Origin', OTHER_ORIGIN)
      .set('Access-Control-Request-Method', 'GET');

    // The browser blocks the call when this header is missing. The `cors` package still sends
    // Access-Control-Allow-Methods to any origin; that header alone grants nothing.
    expect(res.headers).not.toHaveProperty('access-control-allow-origin');
  });

  it('responde ao preflight de uma origem da lista', async () => {
    const res = await request(createApp())
      .options('/api/v1/users')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'GET');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
  });
});
