import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { SpyLogger } from '../../../test/doubles/SpyLogger';
import { makeErrorHandler } from './errorHandler';
import { makePublicRateLimit } from './publicRateLimit';

const makeApp = (maxPerMinute: number) => {
  const app = express();
  app.set('trust proxy', true);
  const limit = makePublicRateLimit(maxPerMinute);
  // One limiter shared by two routes, like /health and /ready: they spend the same quota.
  app.get('/health', limit, (_req, res) => {
    res.sendStatus(200);
  });
  app.get('/ready', limit, (_req, res) => {
    res.sendStatus(200);
  });
  app.use(makeErrorHandler({ logger: new SpyLogger(), exposeStack: false }));
  return app;
};

const get = (app: express.Express, path: string, ip = '203.0.113.7') =>
  request(app).get(path).set('X-Forwarded-For', ip);

describe('makePublicRateLimit', () => {
  it('deve responder 429 RATE_LIMITED, com Retry-After, quando o IP passa do limite', async () => {
    const app = makeApp(2);

    const statuses = [(await get(app, '/health')).status, (await get(app, '/health')).status];
    const blocked = await get(app, '/health');

    expect(statuses).toEqual([200, 200]);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('deve somar as rotas que dividem o limitador', async () => {
    const app = makeApp(2);

    await get(app, '/health');
    await get(app, '/ready');
    const blocked = await get(app, '/health');

    expect(blocked.status).toBe(429);
  });

  it('deve contar cada IP à parte', async () => {
    const app = makeApp(1);

    await get(app, '/health', '203.0.113.7');
    const blocked = await get(app, '/health', '203.0.113.7');
    const other = await get(app, '/health', '203.0.113.8');

    expect(blocked.status).toBe(429);
    expect(other.status).toBe(200);
  });

  it('deve contar juntos os endereços IPv6 do mesmo bloco /56', async () => {
    const app = makeApp(1);

    await get(app, '/health', '2001:db8:abcd:12ff::1');
    const sameBlock = await get(app, '/health', '2001:db8:abcd:12ee::9999');
    const otherBlock = await get(app, '/health', '2001:db8:abcd:13ff::1');

    expect(sameBlock.status).toBe(429);
    expect(otherBlock.status).toBe(200);
  });

  it('deve criar o limitador sem o aviso ERR_ERL_KEY_GEN_IPV6 do express-rate-limit', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    makePublicRateLimit(5);

    const text = logged.mock.calls.map((call) => String(call[0])).join('\n');
    logged.mockRestore();
    expect(text).not.toContain('ERR_ERL_KEY_GEN_IPV6');
  });
});
