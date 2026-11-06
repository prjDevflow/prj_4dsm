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

type Actor = Parameters<typeof bearer>[0];

const asAdmin = () => insertUser({ nome: 'Admin', perfil: 'ADMIN' });
const post = (actor: Actor, id: string, body: object) =>
  request(app)
    .post(`/api/v1/terminals/${id}/enroll-mode`)
    .set('Authorization', bearer(actor))
    .send(body);
const stored = (id: string) => prisma.terminal.findUniqueOrThrow({ where: { id } });

describe('POST /api/v1/terminals/:id/enroll-mode', () => {
  beforeEach(resetDatabase);

  it('200 grava o usuário e o prazo de 60 s, sem alterar a chave nem o último contato', async () => {
    const admin = await asAdmin();
    const user = await insertUser();
    const contact = new Date('2026-10-20T14:00:00Z');
    const terminal = await insertTerminal({
      apiKeyHash: sha256Hex('b'),
      ultimoContatoEm: contact,
    });

    const before = Date.now();
    const res = await post(admin, terminal.id, { usuarioId: user.id });
    const after = Date.now();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      terminalId: terminal.id,
      usuarioId: user.id,
      modoCadastroAte: expect.any(String),
    });
    const row = await stored(terminal.id);
    expect(row.modoCadastroUsuarioId).toBe(user.id);
    expect(row.modoCadastroAte?.toISOString()).toBe(res.body.modoCadastroAte);
    expect(row.modoCadastroAte!.getTime()).toBeGreaterThanOrEqual(before + 60_000);
    expect(row.modoCadastroAte!.getTime()).toBeLessThanOrEqual(after + 60_000);
    expect(row).toMatchObject({ apiKeyHash: sha256Hex('b'), ultimoContatoEm: contact });
  });

  it('a resposta do terminal continua sem expor o modo de cadastro', async () => {
    const admin = await asAdmin();
    const user = await insertUser();
    const terminal = await insertTerminal();
    await post(admin, terminal.id, { usuarioId: user.id });

    const res = await request(app)
      .get(`/api/v1/terminals/${terminal.id}`)
      .set('Authorization', bearer(admin));

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('modoCadastroUsuarioId');
    expect(res.body).not.toHaveProperty('modoCadastroAte');
  });

  it.each([
    ['inexistente', newId()],
    ['malformado', 'nao-e-um-id'],
  ])('404 com terminal de id %s', async (_case, id) => {
    const admin = await asAdmin();
    const user = await insertUser();

    const res = await post(admin, id, { usuarioId: user.id });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Terminal não encontrado',
    });
  });

  it('404 para usuário inexistente, sem abrir o modo', async () => {
    const admin = await asAdmin();
    const terminal = await insertTerminal();

    const res = await post(admin, terminal.id, { usuarioId: newId() });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
    expect((await stored(terminal.id)).modoCadastroUsuarioId).toBeNull();
  });

  it.each([
    ['ausente', {}],
    ['malformado', { usuarioId: 'nao-e-um-id' }],
  ])('422 com usuarioId %s', async (_case, body) => {
    const admin = await asAdmin();
    const terminal = await insertTerminal();

    const res = await post(admin, terminal.id, body);

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([expect.objectContaining({ field: 'usuarioId' })]);
  });

  it('422 para usuário inativo, sem abrir o modo', async () => {
    const admin = await asAdmin();
    const user = await insertUser({ ativo: false });
    const terminal = await insertTerminal();

    const res = await post(admin, terminal.id, { usuarioId: user.id });

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([expect.objectContaining({ field: 'usuarioId' })]);
    expect((await stored(terminal.id)).modoCadastroUsuarioId).toBeNull();
  });

  it('422 para terminal inativo, sem abrir o modo', async () => {
    const admin = await asAdmin();
    const user = await insertUser();
    const terminal = await insertTerminal({ ativo: false });

    const res = await post(admin, terminal.id, { usuarioId: user.id });

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([expect.objectContaining({ field: 'id' })]);
    expect((await stored(terminal.id)).modoCadastroUsuarioId).toBeNull();
  });

  it('401 sem token', async () => {
    const terminal = await insertTerminal();

    const res = await request(app)
      .post(`/api/v1/terminals/${terminal.id}/enroll-mode`)
      .send({ usuarioId: newId() });

    expect(res.status).toBe(401);
  });

  it.each(['CONDOMINO', 'VISITANTE'] as const)('403 para %s, sem abrir o modo', async (perfil) => {
    const user = await insertUser({ perfil });
    const terminal = await insertTerminal();

    const res = await post(user, terminal.id, { usuarioId: user.id });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect((await stored(terminal.id)).modoCadastroUsuarioId).toBeNull();
  });
});
