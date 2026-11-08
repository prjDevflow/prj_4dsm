import request from 'supertest';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { createApp } from '../../src/main/app';
import { container } from '../../src/main/container';
import { AppError } from '../../src/shared/errors/AppError';
import { bearer, insertUser, resetDatabase } from './helpers';

const makeApp = ({ isProduction = false } = {}) =>
  createApp({
    isProduction,
    extraRoutes: (router) => {
      router.get('/__test/boom', () => {
        throw new Error('falha inesperada');
      });
      router.get('/__test/app-error', () => {
        throw new AppError('TESTE', 'Erro de teste', 418);
      });
      router.post('/__test/echo', (req, res) => {
        res.json(req.body);
      });
      router.post('/__test/zod', (req) => {
        z.object({ nome: z.string().min(1) }).parse(req.body);
      });
    },
  });

describe('tratamento de erros', () => {
  it('404 NOT_FOUND no formato padrão para rota inexistente', async () => {
    const res = await request(makeApp()).get('/api/v1/nao-existe');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) } });
  });

  it('500 INTERNAL_ERROR sem stack nem mensagem original em produção', async () => {
    const res = await request(makeApp({ isProduction: true })).get('/api/v1/__test/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' },
    });
  });

  it('500 INTERNAL_ERROR com stack fora de produção', async () => {
    const res = await request(makeApp({ isProduction: false })).get('/api/v1/__test/boom');

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.stack).toContain('falha inesperada');
  });

  it('AppError usa o status e o code dele', async () => {
    const res = await request(makeApp()).get('/api/v1/__test/app-error');

    expect(res.status).toBe(418);
    expect(res.body).toEqual({ error: { code: 'TESTE', message: 'Erro de teste' } });
  });

  it('422 VALIDATION_ERROR para JSON malformado no corpo', async () => {
    const res = await request(makeApp())
      .post('/api/v1/__test/echo')
      .set('Content-Type', 'application/json')
      .send('{"nome":');

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('422 VALIDATION_ERROR com details por campo quando o zod rejeita o corpo', async () => {
    const res = await request(makeApp()).post('/api/v1/__test/zod').send({ nome: '' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([{ field: 'nome', message: expect.any(String) }]);
  });

  describe('corpo grande demais', () => {
    const LIMIT = 100 * 1024;
    /** A JSON body of exactly `bytes` bytes (ASCII). */
    const bodyOfSize = (bytes: number) => {
      const base = JSON.stringify({ padding: '' }).length;
      return JSON.stringify({ padding: 'x'.repeat(bytes - base) });
    };
    const post = (body: string) =>
      request(makeApp())
        .post('/api/v1/__test/echo')
        .set('Content-Type', 'application/json')
        .send(body);

    it('413 PAYLOAD_TOO_LARGE no formato padrão para um corpo acima de 100 kb (não 500)', async () => {
      const res = await post(bodyOfSize(LIMIT + 1));

      expect(res.status).toBe(413);
      expect(res.body).toEqual({
        error: { code: 'PAYLOAD_TOO_LARGE', message: expect.any(String) },
      });
    });

    it('um corpo de exatamente 100 kb ainda chega à rota', async () => {
      const res = await post(bodyOfSize(LIMIT));

      expect(res.status).toBe(200);
    });

    it('o limite de 64 kb do lote offline não vale para as outras rotas: 90 kb passam', async () => {
      const res = await post(bodyOfSize(90 * 1024));

      expect(res.status).toBe(200);
    });
  });
});

describe('erro 500 numa rota real, em produção', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('não mostra stack, mensagem interna nem o que estava dentro do erro', async () => {
    await resetDatabase();
    const admin = await insertUser({ perfil: 'ADMIN' });
    // The database driver failed in the middle of an authenticated request.
    vi.spyOn(container.users, 'findById').mockRejectedValue(
      new Error('connect ECONNREFUSED postgresql://access:senha-do-banco@db:5432/access'),
    );

    const res = await request(createApp({ isProduction: true }))
      .get('/api/v1/auth/me')
      .set('Authorization', bearer(admin));

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' },
    });
    expect(JSON.stringify([res.body, res.headers, res.text])).not.toContain('senha-do-banco');
    expect(res.headers).not.toHaveProperty('x-powered-by');
  });
});
