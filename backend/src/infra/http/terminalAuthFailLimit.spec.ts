import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { SpyLogger } from '../../../test/doubles/SpyLogger';
import { ForbiddenError, UnauthorizedError, ValidationError } from '../../shared/errors/AppError';
import { makeErrorHandler } from './errorHandler';
import { makeTerminalAuthFailLimit } from './terminalAuthFailLimit';

// A tiny app. The limiter runs first, like in front of `authenticateTerminal`; the stub below plays
// that middleware: right key passes, wrong key is a 401 and `x-inativo` is a 403.
const makeApp = (maxPerMinute: number) => {
  const app = express();
  app.set('trust proxy', true);
  const limit = makeTerminalAuthFailLimit(maxPerMinute);
  const authenticate: express.RequestHandler = (req, _res, next) => {
    if (req.header('x-key') !== 'certa') throw new UnauthorizedError();
    if (req.header('x-inativo')) throw new ForbiddenError();
    next();
  };
  app.get('/terminal/x', limit, authenticate, (_req, res) => {
    res.sendStatus(200);
  });
  app.get('/terminal/invalido', limit, () => {
    throw new ValidationError('Dados inválidos');
  });
  app.get('/terminal/quebra', limit, () => {
    throw new Error('falha inesperada');
  });
  app.use(makeErrorHandler({ logger: new SpyLogger(), exposeStack: false }));
  return app;
};

const good = (app: express.Express, ip = '203.0.113.7') =>
  request(app).get('/terminal/x').set('x-key', 'certa').set('X-Forwarded-For', ip);
const bad = (app: express.Express, ip = '203.0.113.7') =>
  request(app).get('/terminal/x').set('x-key', 'errada').set('X-Forwarded-For', ip);

describe('makeTerminalAuthFailLimit', () => {
  it('deve contar só os 401 e 403: terminais que acertam a chave não gastam o limite', async () => {
    const app = makeApp(2);

    for (let i = 0; i < 5; i++) expect((await good(app)).status).toBe(200);
    const first = await bad(app);
    const second = await request(app)
      .get('/terminal/x')
      .set('x-key', 'certa')
      .set('x-inativo', '1')
      .set('X-Forwarded-For', '203.0.113.7');
    const blocked = await bad(app);

    expect(first.status).toBe(401);
    expect(second.status).toBe(403);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('deve ignorar as respostas 422 e 500, que não são falha de autenticação', async () => {
    const app = makeApp(2);

    for (let i = 0; i < 4; i++) {
      expect(
        (await request(app).get('/terminal/invalido').set('X-Forwarded-For', '203.0.113.7')).status,
      ).toBe(422);
      expect(
        (await request(app).get('/terminal/quebra').set('X-Forwarded-For', '203.0.113.7')).status,
      ).toBe(500);
    }

    expect((await bad(app)).status).toBe(401);
  });

  it('deve bloquear o IP inteiro depois do limite, até com a chave certa, e deixar os outros IPs passarem', async () => {
    const app = makeApp(1);

    await bad(app, '203.0.113.7');
    const sameIpGoodKey = await good(app, '203.0.113.7');
    const otherIp = await good(app, '203.0.113.8');

    expect(sameIpGoodKey.status).toBe(429);
    expect(otherIp.status).toBe(200);
  });

  it('deve contar juntos os endereços IPv6 do mesmo bloco /56', async () => {
    const app = makeApp(1);

    await bad(app, '2001:db8:abcd:12ff::1');
    const sameBlock = await bad(app, '2001:db8:abcd:12ee::9999');
    const otherBlock = await bad(app, '2001:db8:abcd:13ff::1');

    expect(sameBlock.status).toBe(429);
    expect(otherBlock.status).toBe(401);
  });

  it('deve criar o limitador sem o aviso ERR_ERL_KEY_GEN_IPV6 do express-rate-limit', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    makeTerminalAuthFailLimit(5);

    const text = logged.mock.calls.map((call) => String(call[0])).join('\n');
    logged.mockRestore();
    expect(text).not.toContain('ERR_ERL_KEY_GEN_IPV6');
  });
});
