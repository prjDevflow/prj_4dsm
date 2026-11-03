import { createHash } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import {
  bearer,
  insertQrCredential,
  insertTerminal,
  insertUser,
  prisma,
  resetDatabase,
} from './helpers';

const app = createApp();

const KEY = 'chave-de-teste-do-terminal-0123456789abcdef';
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const PAYLOAD = /^ACS1:[A-Za-z0-9_-]{22}$/;

const issueQr = (terminalId: string, key: string = KEY) =>
  request(app)
    .post('/api/v1/terminal/qr')
    .set({ 'X-Terminal-Id': terminalId, 'X-Terminal-Key': key });

const tokenOf = (payload: string) => payload.slice('ACS1:'.length);
const storedCredentials = () => prisma.qrCredential.findMany({ orderBy: { emitidoEm: 'asc' } });

describe('POST /api/v1/terminal/qr', () => {
  beforeEach(resetDatabase);

  it('200 com payload, emitidoEm, expiraEm e renovarEmMs', async () => {
    const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });
    const before = Date.now();

    const res = await issueQr(terminal.id);

    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual([
      'emitidoEm',
      'expiraEm',
      'payload',
      'renovarEmMs',
    ]);
    expect(res.body.payload).toMatch(PAYLOAD);
    expect(Math.abs(Date.parse(res.body.emitidoEm) - before)).toBeLessThan(5000);
    expect(Date.parse(res.body.expiraEm) - Date.parse(res.body.emitidoEm)).toBe(15_000);
    expect(res.body.renovarEmMs).toBe(10000);
  });

  it('grava só o hash SHA-256 do token (64 hexadecimais), com a validade de 15 s e sem uso', async () => {
    const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });

    const res = await issueQr(terminal.id);

    const token = tokenOf(res.body.payload);
    const rows = await storedCredentials();
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row!.tokenHash).toBe(sha256(token));
    expect(JSON.stringify(row)).not.toContain(token);
    expect(row).toMatchObject({ terminalId: terminal.id, consumidoEm: null, consumidoPorId: null });
    expect(row!.emitidoEm.toISOString()).toBe(res.body.emitidoEm);
    expect(row!.expiraEm.toISOString()).toBe(res.body.expiraEm);
  });

  it('401 UNAUTHORIZED com chave errada, sem cabeçalhos ou só com um token de usuário, sem emitir', async () => {
    const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });
    const admin = await insertUser({ perfil: 'ADMIN' });

    const wrongKey = await issueQr(terminal.id, 'outra-chave');
    const noHeaders = await request(app).post('/api/v1/terminal/qr');
    const userToken = await request(app)
      .post('/api/v1/terminal/qr')
      .set('Authorization', bearer(admin));

    for (const res of [wrongKey, noHeaders, userToken]) {
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    }
    expect(await storedCredentials()).toHaveLength(0);
  });

  it('403 FORBIDDEN para terminal inativo com a chave certa, sem emitir', async () => {
    const terminal = await insertTerminal({ apiKeyHash: sha256(KEY), ativo: false });

    const res = await issueQr(terminal.id);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(await storedCredentials()).toHaveLength(0);
  });

  describe('limite de um QR a cada 5 s', () => {
    it('429 RATE_LIMITED no segundo pedido em seguida, sem gravar outra credencial', async () => {
      const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });
      await issueQr(terminal.id);

      const res = await issueQr(terminal.id);

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('RATE_LIMITED');
      expect(await storedCredentials()).toHaveLength(1);
    });

    it('200 de novo quando o último QR tem mais de 5 s, e o anterior continua gravado', async () => {
      const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });
      const emitidoEm = new Date(Date.now() - 6000);
      await insertQrCredential({
        terminalId: terminal.id,
        emitidoEm,
        expiraEm: new Date(emitidoEm.getTime() + 15_000),
      });

      const res = await issueQr(terminal.id);

      expect(res.status).toBe(200);
      expect(await storedCredentials()).toHaveLength(2);
    });

    it('o limite é por terminal: outro terminal não é barrado', async () => {
      const first = await insertTerminal({ apiKeyHash: sha256(KEY) });
      const second = await insertTerminal({ apiKeyHash: sha256(KEY) });
      await issueQr(first.id);

      const res = await issueQr(second.id);

      expect(res.status).toBe(200);
    });

    it('de oito pedidos simultâneos, só um QR é emitido e os outros dão 429', async () => {
      const terminal = await insertTerminal({ apiKeyHash: sha256(KEY) });

      const responses = await Promise.all(Array.from({ length: 8 }, () => issueQr(terminal.id)));

      const statuses = responses.map((res) => res.status).sort();
      expect(statuses).toEqual([200, 429, 429, 429, 429, 429, 429, 429]);
      expect(await storedCredentials()).toHaveLength(1);
    });
  });
});
