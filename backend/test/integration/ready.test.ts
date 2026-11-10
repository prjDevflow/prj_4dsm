import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPrismaClient } from '../../src/infra/database/prisma';
import { PrismaDatabaseProbe } from '../../src/infra/providers/PrismaDatabaseProbe';
import { app } from '../../src/main/app';
import { container } from '../../src/main/container';
import { SpyLogger } from '../doubles/SpyLogger';

describe('GET /api/v1/ready', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('200 sem token, com status ready, db up e a hora em ISO, quando o banco responde', async () => {
    const res = await request(app).get('/api/v1/ready');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ready', db: 'up', time: expect.any(String) });
    expect(new Date(res.body.time).toISOString()).toBe(res.body.time);
  });

  it('503 com status unavailable e db down quando o banco não responde', async () => {
    vi.spyOn(container.databaseProbe, 'ping').mockRejectedValue(new Error('connection refused'));

    const res = await request(app).get('/api/v1/ready');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'unavailable', db: 'down', time: expect.any(String) });
  });

  it('503 não mostra no corpo o erro do banco', async () => {
    vi.spyOn(container.databaseProbe, 'ping').mockRejectedValue(
      new Error('password authentication failed for user "access"'),
    );

    const res = await request(app).get('/api/v1/ready');

    expect(JSON.stringify(res.body)).not.toContain('password');
  });
});

describe('PrismaDatabaseProbe com o banco fora', () => {
  it('rejeita depressa quando ninguém atende na porta do banco', async () => {
    const prisma = createPrismaClient('postgresql://access:x@127.0.0.1:1/access', new SpyLogger());
    const startedAt = Date.now();

    try {
      await expect(new PrismaDatabaseProbe(prisma).ping()).rejects.toBeDefined();
      // The pool gives up after 2 s; a monitor must not wait much longer than that.
      expect(Date.now() - startedAt).toBeLessThan(5000);
    } finally {
      await prisma.$disconnect();
    }
  });
});
