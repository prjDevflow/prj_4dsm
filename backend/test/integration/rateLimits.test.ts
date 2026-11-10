import { createHash } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import { container } from '../../src/main/container';
import { insertTerminal, resetDatabase } from './helpers';
import { listRegisteredRoutes } from './routeInventory';

const { TERMINAL_MAX_PER_MINUTE, TERMINAL_AUTH_FAIL_MAX_PER_MINUTE, PUBLIC_MAX_PER_MINUTE } =
  container.env;

const KEY = 'chave-de-teste-do-terminal-0123456789abcdef';
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const credentials = (terminal: { id: string }) => ({
  'X-Terminal-Id': terminal.id,
  'X-Terminal-Key': KEY,
});

// Every route the terminal calls, read from the router: a new terminal route is tested by itself. The ack
// route gets an id that does not exist: any answer but 429 means the limiter did not stop it.
const TERMINAL_ROUTES = listRegisteredRoutes()
  .filter((route) => route.path.startsWith('/terminal/'))
  .map((route) => [route.method, `/api/v1${route.path.replace(':id', '1')}`] as const);

describe('limite de requisições do terminal autenticado', () => {
  beforeEach(resetDatabase);

  it('dá 429 RATE_LIMITED, em todas as rotas do terminal, depois de TERMINAL_MAX_PER_MINUTE requisições somadas', async () => {
    expect(TERMINAL_ROUTES.length).toBeGreaterThanOrEqual(6);
    const app = createApp();
    const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });
    for (let i = 0; i < TERMINAL_MAX_PER_MINUTE; i++) {
      const res = await request(app).get('/api/v1/terminal/commands').set(credentials(terminal));
      expect(res.status).toBe(200);
    }

    for (const [method, path] of TERMINAL_ROUTES) {
      const res = await request(app)[method](path).set(credentials(terminal)).send({});

      expect(res.status, `${method.toUpperCase()} ${path}`).toBe(429);
      expect(res.body.error.code).toBe('RATE_LIMITED');
      expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    }
  });

  it('conta cada terminal à parte: o excesso de um não bloqueia o outro', async () => {
    const app = createApp();
    const busy = await insertTerminal({ apiKeyHash: sha256(KEY) });
    const quiet = await insertTerminal({ apiKeyHash: sha256(KEY) });
    for (let i = 0; i < TERMINAL_MAX_PER_MINUTE; i++) {
      await request(app).get('/api/v1/terminal/commands').set(credentials(busy));
    }

    const blocked = await request(app).get('/api/v1/terminal/commands').set(credentials(busy));
    const free = await request(app).get('/api/v1/terminal/commands').set(credentials(quiet));

    expect(blocked.status).toBe(429);
    expect(free.status).toBe(200);
  });
});

describe('limite de falhas de autenticação do terminal por IP', () => {
  beforeEach(resetDatabase);

  const wrongKey = (app: ReturnType<typeof createApp>, terminal: { id: string }, ip: string) =>
    request(app)
      .get('/api/v1/terminal/commands')
      .set({ 'X-Terminal-Id': terminal.id, 'X-Terminal-Key': 'chave-errada' })
      .set('X-Forwarded-For', ip);

  it('dá 429 na falha seguinte ao limite, antes de consultar o terminal; outro IP segue com 401', async () => {
    const app = createApp({ trustProxy: 1 });
    const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });
    for (let i = 0; i < TERMINAL_AUTH_FAIL_MAX_PER_MINUTE; i++) {
      expect((await wrongKey(app, terminal, '203.0.113.7')).status).toBe(401);
    }

    const blocked = await wrongKey(app, terminal, '203.0.113.7');
    const otherIp = await wrongKey(app, terminal, '203.0.113.8');

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect(otherIp.status).toBe(401);
  });

  it('não gasta o limite com as requisições que acertam a chave', async () => {
    const app = createApp({ trustProxy: 1 });
    const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });
    for (let i = 0; i < TERMINAL_AUTH_FAIL_MAX_PER_MINUTE - 1; i++) {
      await wrongKey(app, terminal, '203.0.113.7');
    }
    for (let i = 0; i < 20; i++) {
      const ok = await request(app)
        .get('/api/v1/terminal/commands')
        .set(credentials(terminal))
        .set('X-Forwarded-For', '203.0.113.7');
      expect(ok.status).toBe(200);
    }

    const stillOpen = await wrongKey(app, terminal, '203.0.113.7');

    expect(stillOpen.status).toBe(401);
  });
});

describe('limite das rotas públicas (/health e /ready)', () => {
  it('dá 429 RATE_LIMITED depois de PUBLIC_MAX_PER_MINUTE requisições do IP, somando as duas rotas', async () => {
    const app = createApp();
    for (let i = 0; i < PUBLIC_MAX_PER_MINUTE; i++) {
      const path = i % 2 === 0 ? '/api/v1/health' : '/api/v1/ready';
      expect((await request(app).get(path)).status).toBe(200);
    }

    const health = await request(app).get('/api/v1/health');
    const ready = await request(app).get('/api/v1/ready');

    for (const res of [health, ready]) {
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('RATE_LIMITED');
      expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    }
  });

  it('não mexe no limite do login: o login continua respondendo com o limite dele', async () => {
    const app = createApp();
    for (let i = 0; i < PUBLIC_MAX_PER_MINUTE; i++) await request(app).get('/api/v1/health');

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ninguem@teste.com', senha: 'Senha-Valida-123' });

    expect(login.status).toBe(401);
  });
});

describe('TRUST_PROXY: de onde vem o IP do cliente', () => {
  const sweep = async (app: ReturnType<typeof createApp>) => {
    const statuses: number[] = [];
    for (let i = 0; i <= PUBLIC_MAX_PER_MINUTE; i++) {
      const res = await request(app)
        .get('/api/v1/health')
        .set('X-Forwarded-For', `198.51.100.${i}`);
      statuses.push(res.status);
    }
    return statuses;
  };

  it('com 0 ignora o X-Forwarded-For: trocar o cabeçalho não escapa do limite', async () => {
    const statuses = await sweep(createApp({ trustProxy: 0 }));

    expect(statuses.at(-1)).toBe(429);
  });

  it('com 1 confia no proxy da frente: clientes diferentes têm limites diferentes', async () => {
    const statuses = await sweep(createApp({ trustProxy: 1 }));

    expect(statuses.every((status) => status === 200)).toBe(true);
  });
});
