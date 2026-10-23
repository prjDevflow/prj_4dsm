import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from '../../src/main/app';

describe('GET /api/v1/health', () => {
  it('200 com status ok, a versão do package.json, a hora em ISO e db up', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      version: '0.1.0',
      time: expect.any(String),
      db: 'up',
    });
    expect(new Date(res.body.time).toISOString()).toBe(res.body.time);
  });

  it('gera um X-Request-Id quando a requisição não traz um', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.headers['x-request-id']).toMatch(/^[\w-]{1,100}$/);
  });

  it('reaproveita o X-Request-Id recebido quando ele é válido', async () => {
    const res = await request(app).get('/api/v1/health').set('X-Request-Id', 'abc-123');

    expect(res.headers['x-request-id']).toBe('abc-123');
  });

  it('ignora um X-Request-Id inválido e gera outro', async () => {
    const res = await request(app).get('/api/v1/health').set('X-Request-Id', 'ruim<script>');

    expect(res.headers['x-request-id']).not.toBe('ruim<script>');
    expect(res.headers['x-request-id']).toMatch(/^[\w-]{1,100}$/);
  });
});
