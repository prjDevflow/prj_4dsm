import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createApp } from '../../src/main/app';
import { AppError } from '../../src/shared/errors/AppError';

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
});
