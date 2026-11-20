import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { SpyLogger } from '../../../test/doubles/SpyLogger';
import { makeErrorHandler } from './errorHandler';
import { makeTerminalRateLimit } from './terminalRateLimit';

// A tiny app: the header stands in for what `authenticateTerminal` puts in `req.terminal`.
const makeApp = (maxPerMinute: number, { authenticated = true } = {}) => {
  const app = express();
  app.use((req, _res, next) => {
    const id = req.header('x-test-terminal');
    if (authenticated && id) req.terminal = { terminalId: id, accessPointId: 'ponto' };
    next();
  });
  app.get('/terminal/x', makeTerminalRateLimit(maxPerMinute), (_req, res) => {
    res.sendStatus(200);
  });
  app.use(makeErrorHandler({ logger: new SpyLogger(), exposeStack: false }));
  return app;
};

const call = (app: express.Express, terminal: string) =>
  request(app).get('/terminal/x').set('x-test-terminal', terminal);

describe('makeTerminalRateLimit', () => {
  it('deve responder 429 RATE_LIMITED, com Retry-After, quando o terminal passa do limite', async () => {
    const app = makeApp(2);

    const statuses = [(await call(app, 't1')).status, (await call(app, 't1')).status];
    const blocked = await call(app, 't1');

    expect(statuses).toEqual([200, 200]);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('deve contar cada terminal à parte: o excesso de um não bloqueia o outro', async () => {
    const app = makeApp(1);

    await call(app, 't1');
    const blocked = await call(app, 't1');
    const other = await call(app, 't2');

    expect(blocked.status).toBe(429);
    expect(other.status).toBe(200);
  });

  it('deve recusar com 401 quando usado sem a autenticação do terminal antes dele', async () => {
    const res = await call(makeApp(5, { authenticated: false }), 't1');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
