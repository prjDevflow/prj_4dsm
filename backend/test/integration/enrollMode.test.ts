import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import {
  bearer,
  insertTerminal,
  insertUser,
  newId,
  prisma,
  resetDatabase,
  sha256Hex,
} from './helpers';

const app = createApp();

const asAdmin = () => insertUser({ nome: 'Admin', perfil: 'ADMIN' });
type Auth = Parameters<typeof bearer>[0];

const enroll = (admin: Auth, terminalId: string, body: unknown) =>
  request(app)
    .post(`/api/v1/terminals/${terminalId}/enroll-mode`)
    .set('Authorization', bearer(admin))
    .send(body as object);

const fieldsOf = (res: request.Response) =>
  (res.body.error.details as { field: string }[]).map((d) => d.field);

describe('POST /api/v1/terminals/:id/enroll-mode', () => {
  beforeEach(resetDatabase);

  it('200 com terminalId, usuarioId e expiraEm, e grava o usuário e o prazo de agora mais ENROLL_MODE_SECONDS (45 s nos testes, para provar a fiação)', async () => {
    const admin = await asAdmin();
    const user = await insertUser();
    const terminal = await insertTerminal();

    const before = Date.now();
    const res = await enroll(admin, terminal.id, { usuarioId: user.id });
    const after = Date.now();

    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(['expiraEm', 'terminalId', 'usuarioId']);
    expect(res.body).toMatchObject({ terminalId: terminal.id, usuarioId: user.id });
    const expiraEm = new Date(res.body.expiraEm).getTime();
    expect(res.body.expiraEm).toBe(new Date(expiraEm).toISOString());
    expect(expiraEm).toBeGreaterThanOrEqual(before + 45_000);
    expect(expiraEm).toBeLessThanOrEqual(after + 45_000);
    const row = await prisma.terminal.findUniqueOrThrow({ where: { id: terminal.id } });
    expect(row.modoCadastroUsuarioId).toBe(user.id);
    expect(row.modoCadastroAte?.toISOString()).toBe(res.body.expiraEm);
  });

  it('deixa a chave, o contato, o nome e o estado do terminal como estavam', async () => {
    const admin = await asAdmin();
    const user = await insertUser();
    const contact = new Date('2026-10-20T14:00:00.000Z');
    const terminal = await insertTerminal({
      nome: 'Terminal Social',
      apiKeyHash: sha256Hex('c'),
      ultimoContatoEm: contact,
      ultimaLat: -23.1,
      gpsFix: true,
      firmware: '0.3.0',
      rssi: -60,
    });

    await enroll(admin, terminal.id, { usuarioId: user.id });

    const row = await prisma.terminal.findUniqueOrThrow({ where: { id: terminal.id } });
    expect(row).toMatchObject({
      nome: 'Terminal Social',
      apiKeyHash: sha256Hex('c'),
      ativo: true,
      ultimoContatoEm: contact,
      ultimaLat: -23.1,
      gpsFix: true,
      firmware: '0.3.0',
      rssi: -60,
    });
  });

  it('ativar de novo substitui o usuário e o prazo do modo anterior', async () => {
    const admin = await asAdmin();
    const ana = await insertUser();
    const bruno = await insertUser();
    const terminal = await insertTerminal();
    const first = await enroll(admin, terminal.id, { usuarioId: ana.id });

    const second = await enroll(admin, terminal.id, { usuarioId: bruno.id });

    expect(second.status).toBe(200);
    const row = await prisma.terminal.findUniqueOrThrow({ where: { id: terminal.id } });
    expect(row.modoCadastroUsuarioId).toBe(bruno.id);
    expect(row.modoCadastroAte?.toISOString()).toBe(second.body.expiraEm);
    expect(new Date(second.body.expiraEm).getTime()).toBeGreaterThan(
      new Date(first.body.expiraEm).getTime(),
    );
  });

  it('só o terminal pedido entra em modo de cadastro', async () => {
    const admin = await asAdmin();
    const user = await insertUser();
    const target = await insertTerminal();
    const other = await insertTerminal();

    await enroll(admin, target.id, { usuarioId: user.id });

    const untouched = await prisma.terminal.findUniqueOrThrow({ where: { id: other.id } });
    expect(untouched.modoCadastroUsuarioId).toBeNull();
    expect(untouched.modoCadastroAte).toBeNull();
  });

  it('aceita terminal inativo e usuário de qualquer perfil', async () => {
    const admin = await asAdmin();
    const visitor = await insertUser({ perfil: 'VISITANTE' });
    const terminal = await insertTerminal({ ativo: false });

    const res = await enroll(admin, terminal.id, { usuarioId: visitor.id });

    expect(res.status).toBe(200);
  });

  it('404 para terminal inexistente e para id malformado', async () => {
    const admin = await asAdmin();
    const user = await insertUser();

    const missing = await enroll(admin, newId(), { usuarioId: user.id });
    const malformed = await enroll(admin, 'abc', { usuarioId: user.id });

    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
    expect(malformed.status).toBe(404);
  });

  it('404 para usuário inexistente e 422 no campo usuarioId para usuário inativo, sem gravar', async () => {
    const admin = await asAdmin();
    const inactive = await insertUser({ ativo: false });
    const terminal = await insertTerminal();

    const missing = await enroll(admin, terminal.id, { usuarioId: newId() });
    const off = await enroll(admin, terminal.id, { usuarioId: inactive.id });

    expect(missing.status).toBe(404);
    expect(off.status).toBe(422);
    expect(off.body.error.details).toEqual([{ field: 'usuarioId', message: 'Usuário inativo' }]);
    const row = await prisma.terminal.findUniqueOrThrow({ where: { id: terminal.id } });
    expect(row.modoCadastroUsuarioId).toBeNull();
    expect(row.modoCadastroAte).toBeNull();
  });

  it('422 no campo usuarioId para id malformado, ausente ou que não é texto', async () => {
    const admin = await asAdmin();
    const terminal = await insertTerminal();

    for (const body of [{}, { usuarioId: 'abc' }, { usuarioId: 123 }, { usuarioId: null }]) {
      const res = await enroll(admin, terminal.id, body);
      expect(res.status, JSON.stringify(body)).toBe(422);
      expect(fieldsOf(res)).toEqual(['usuarioId']);
    }
  });

  it('o GET /terminals/:id continua sem mostrar o modo de cadastro', async () => {
    const admin = await asAdmin();
    const user = await insertUser();
    const terminal = await insertTerminal();
    await enroll(admin, terminal.id, { usuarioId: user.id });

    const res = await request(app)
      .get(`/api/v1/terminals/${terminal.id}`)
      .set('Authorization', bearer(admin));

    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).not.toContain('modoCadastroUsuarioId');
    expect(Object.keys(res.body)).not.toContain('modoCadastroAte');
    expect(Object.keys(res.body)).not.toContain('apiKeyHash');
  });
});
