import { createHash } from 'node:crypto';
import { Writable } from 'node:stream';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createPino } from '../../src/infra/providers/PinoLogger';
import { createApp } from '../../src/main/app';
import { authenticateTerminal } from '../../src/main/middlewares';
import {
  bearer,
  insertTerminal,
  insertUserWithPassword,
  PASSWORD,
  prisma,
  resetDatabase,
} from './helpers';

// The real request log (pino-http), not a hand-made object: credentials must never reach it.
const makeLoggedApp = () => {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk));
      callback();
    },
  });
  const app = createApp({
    logger: createPino('info', stream),
    extraRoutes: (router) => {
      router.get('/__test/terminal', authenticateTerminal, (req, res) => {
        res.json(req.terminal);
      });
    },
  });
  return { app, output: () => lines.join('') };
};

describe('log das requisições', () => {
  it('registra a requisição mas oculta a chave do terminal, o token e o cookie', async () => {
    const { app, output } = makeLoggedApp();

    await request(app)
      .get('/api/v1/__test/terminal')
      .set('X-Terminal-Id', '5eed0000-0000-4000-8000-000000000006')
      .set('X-Terminal-Key', 'chave-secreta-do-terminal')
      .set('Authorization', 'Bearer token-secreto')
      .set('Cookie', 'sessao=segredo');

    const text = output();
    expect(text).toContain('/api/v1/__test/terminal');
    expect(text).toContain('5eed0000-0000-4000-8000-000000000006');
    expect(text).toContain('[oculto]');
    expect(text).not.toContain('chave-secreta-do-terminal');
    expect(text).not.toContain('token-secreto');
    expect(text).not.toContain('sessao=segredo');
  });
});

describe('fluxos reais não deixam segredo no log', () => {
  beforeEach(resetDatabase);

  it('o login e o uso do token não registram a senha, o token nem o hash da senha', async () => {
    const { app, output } = makeLoggedApp();
    const user = await insertUserWithPassword({ email: 'maria@teste.com' });

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'maria@teste.com', senha: PASSWORD });
    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`);

    expect(login.status).toBe(200);
    expect(me.status).toBe(200);
    const text = output();
    expect(text).toContain('/api/v1/auth/login');
    expect(text).not.toContain(PASSWORD);
    expect(text).not.toContain(login.body.accessToken);
    expect(text).not.toContain(user.senhaHash);
  });

  it('a chave do terminal, a chave nova do rotate-key e os hashes delas não são registrados', async () => {
    const { app, output } = makeLoggedApp();
    const oldKey = 'chave-antiga-do-terminal-0123456789abcdef';
    const terminal = await insertTerminal({
      apiKeyHash: createHash('sha256').update(oldKey).digest('hex'),
    });
    const admin = await insertUserWithPassword({ perfil: 'ADMIN' });
    const heartbeat = {
      latitude: -23.3,
      longitude: -45.9,
      gpsFix: true,
      gpsSimulado: false,
      firmware: '0.3.0',
    };

    const before = await request(app)
      .post('/api/v1/terminal/heartbeat')
      .set({ 'X-Terminal-Id': terminal.id, 'X-Terminal-Key': oldKey })
      .send(heartbeat);
    const rotated = await request(app)
      .post(`/api/v1/terminals/${terminal.id}/rotate-key`)
      .set('Authorization', bearer(admin));
    const newKey: string = rotated.body.apiKey;
    // Not a second heartbeat: two within HEARTBEAT_MIN_INTERVAL_S get a 429.
    const after = await request(app)
      .get('/api/v1/terminal/commands')
      .set({ 'X-Terminal-Id': terminal.id, 'X-Terminal-Key': newKey });

    expect([before.status, rotated.status, after.status]).toEqual([200, 200, 200]);
    const stored = await prisma.terminal.findUniqueOrThrow({ where: { id: terminal.id } });
    const text = output();
    expect(text).toContain('/api/v1/terminal/commands');
    for (const secret of [oldKey, newKey, stored.apiKeyHash, terminal.apiKeyHash]) {
      expect(text).not.toContain(secret);
    }
  });
});
