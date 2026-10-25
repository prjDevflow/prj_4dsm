import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { runSeed, SEED_IDS } from '../../prisma/seed';
import { createApp } from '../../src/main/app';
import { authenticateTerminal } from '../../src/main/middlewares';
import { FakeClock } from '../doubles/FakeClock';
import {
  bearer,
  insertAccessPoint,
  insertTerminal,
  insertUser,
  prisma,
  resetDatabase,
} from './helpers';

// A route that exists only here: the terminal routes of B11 to B19 do not exist yet.
const app = createApp({
  extraRoutes: (router) => {
    router.get('/__test/terminal', authenticateTerminal, (req, res) => {
      res.json(req.terminal);
    });
  },
});

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const KEY = 'chave-de-teste-do-terminal-0123456789abcdef';

const ping = (headers: Record<string, string>) =>
  request(app).get('/api/v1/__test/terminal').set(headers);

describe('middleware authenticateTerminal', () => {
  beforeEach(resetDatabase);

  it('200 com a chave certa e expõe terminalId e accessPointId em req.terminal', async () => {
    const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });

    const res = await ping({ 'X-Terminal-Id': terminal.id, 'X-Terminal-Key': KEY });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ terminalId: terminal.id, accessPointId: terminal.accessPointId });
  });

  it('401 UNAUTHORIZED com chave errada, id inexistente, id malformado ou cabeçalho ausente', async () => {
    const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });
    const attempts = [
      { 'X-Terminal-Id': terminal.id, 'X-Terminal-Key': 'outra-chave' },
      { 'X-Terminal-Id': '5eed0000-0000-4000-8000-0000000000ff', 'X-Terminal-Key': KEY },
      { 'X-Terminal-Id': 'nao-e-id', 'X-Terminal-Key': KEY },
      { 'X-Terminal-Id': terminal.id },
      { 'X-Terminal-Key': KEY },
      {},
    ];

    const results = await Promise.all(attempts.map(ping));

    for (const res of results) {
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    }
    // Same message for every failure: the caller cannot tell which ids exist.
    expect(new Set(results.map((r) => r.body.error.message)).size).toBe(1);
  });

  it('403 FORBIDDEN para terminal inativo com a chave certa, e 401 com a errada', async () => {
    const terminal = await insertTerminal({ apiKeyHash: sha256(KEY), ativo: false });

    const right = await ping({ 'X-Terminal-Id': terminal.id, 'X-Terminal-Key': KEY });
    const wrong = await ping({ 'X-Terminal-Id': terminal.id, 'X-Terminal-Key': 'errada' });

    expect(right.status).toBe(403);
    expect(right.body.error.code).toBe('FORBIDDEN');
    expect(wrong.status).toBe(401);
  });

  it('o JWT de usuário não autentica o terminal, nem a chave do terminal autentica o usuário', async () => {
    const admin = await insertUser({ perfil: 'ADMIN' });
    const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });

    const jwt = await ping({ Authorization: bearer(admin) });
    const asUser = await request(app)
      .get('/api/v1/auth/me')
      .set({ 'X-Terminal-Id': terminal.id, 'X-Terminal-Key': KEY });

    expect(jwt.status).toBe(401);
    expect(asUser.status).toBe(401);
  });

  it('depois do rotate-key a chave antiga deixa de valer na hora e a nova vale', async () => {
    const admin = await insertUser({ perfil: 'ADMIN' });
    const created = await request(app)
      .post('/api/v1/terminals')
      .set('Authorization', bearer(admin))
      .send({
        accessPointId: (await insertAccessPoint()).id,
        nome: 'Terminal Social',
      });
    const headers = (key: string) => ({ 'X-Terminal-Id': created.body.id, 'X-Terminal-Key': key });
    expect((await ping(headers(created.body.apiKey))).status).toBe(200);

    const rotated = await request(app)
      .post(`/api/v1/terminals/${created.body.id}/rotate-key`)
      .set('Authorization', bearer(admin));

    expect((await ping(headers(created.body.apiKey))).status).toBe(401);
    expect((await ping(headers(rotated.body.apiKey))).status).toBe(200);
  });

  it('o terminal do seed autentica com a chave de desenvolvimento', async () => {
    const terminalKey = 'terminal-dev-key-1234567890abcdef1234567890';
    await runSeed(prisma, {
      admin: { email: 'admin@dev.local', password: 'senha-do-admin-1' },
      userPassword: 'senha-dos-usuarios-1',
      terminalKey,
      location: { latitude: -23.30512, longitude: -45.96551 },
      clock: new FakeClock(),
      hasher: {
        hash: (plain) => bcrypt.hash(plain, 4),
        compare: (plain, hash) => bcrypt.compare(plain, hash),
      },
    });

    const res = await ping({ 'X-Terminal-Id': SEED_IDS.terminal, 'X-Terminal-Key': terminalKey });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      terminalId: SEED_IDS.terminal,
      accessPointId: SEED_IDS.accessPoint,
    });
  });
});
