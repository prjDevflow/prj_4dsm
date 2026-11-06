import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import { bearer, insertNfcTag, insertUser, newId, prisma, resetDatabase } from './helpers';

const app = createApp();

type Actor = Parameters<typeof bearer>[0];

const asAdmin = () => insertUser({ nome: 'Admin', perfil: 'ADMIN' });

const post = (actor: Actor, body: object) =>
  request(app).post('/api/v1/nfc-tags').set('Authorization', bearer(actor)).send(body);
const list = (actor: Actor, query: object = {}) =>
  request(app).get('/api/v1/nfc-tags').set('Authorization', bearer(actor)).query(query);
const patch = (actor: Actor, id: string, body: object) =>
  request(app).patch(`/api/v1/nfc-tags/${id}`).set('Authorization', bearer(actor)).send(body);

const fieldsOf = (res: request.Response) =>
  (res.body.error.details as { field: string }[]).map((detail) => detail.field);

describe('rotas /api/v1/nfc-tags', () => {
  beforeEach(resetDatabase);

  describe('POST /nfc-tags', () => {
    it('201 com `04:a1:b2:c3` salvo como 04A1B2C3, com o usuário na resposta', async () => {
      const admin = await asAdmin();
      const user = await insertUser({ nome: 'Maria Souza' });

      const res = await post(admin, {
        usuarioId: user.id,
        uid: '04:a1:b2:c3',
        descricao: '  Chaveiro azul ',
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        usuario: { id: user.id, nome: 'Maria Souza' },
        uid: '04A1B2C3',
        descricao: 'Chaveiro azul',
        ativa: true,
        criadaEm: expect.any(String),
      });
      const saved = await prisma.nfcTag.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(saved).toMatchObject({ uid: '04A1B2C3', usuarioId: user.id, ativa: true });
    });

    it('201 sem descricao, e descricao em branco é o mesmo que nenhuma', async () => {
      const admin = await asAdmin();
      const user = await insertUser();

      const without = await post(admin, { usuarioId: user.id, uid: '04A1B2C1' });
      const blank = await post(admin, { usuarioId: user.id, uid: '04A1B2C2', descricao: '   ' });

      expect(without.body.descricao).toBeNull();
      expect(blank.status).toBe(201);
      expect(blank.body.descricao).toBeNull();
    });

    it.each([
      ['não hexadecimal', '04A1B2G3'],
      ['com 7 caracteres', 'A'.repeat(7)],
      ['com 21 caracteres', 'A'.repeat(21)],
    ])('422 com UID %s, com details no campo uid', async (_case, uid) => {
      const admin = await asAdmin();
      const user = await insertUser();

      const res = await post(admin, { usuarioId: user.id, uid });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(fieldsOf(res)).toEqual(['uid']);
      expect(await prisma.nfcTag.count()).toBe(0);
    });

    it('422 com uid ausente', async () => {
      const admin = await asAdmin();
      const user = await insertUser();

      const res = await post(admin, { usuarioId: user.id });

      expect(res.status).toBe(422);
      expect(fieldsOf(res)).toEqual(['uid']);
    });

    it('422 com uid que não é texto', async () => {
      const admin = await asAdmin();
      const user = await insertUser();

      const res = await post(admin, { usuarioId: user.id, uid: 4161 });

      expect(res.status).toBe(422);
      expect(fieldsOf(res)).toEqual(['uid']);
    });

    it('422 com usuarioId malformado', async () => {
      const admin = await asAdmin();

      const res = await post(admin, { usuarioId: 'nao-e-um-id', uid: '04A1B2C3' });

      expect(res.status).toBe(422);
      expect(fieldsOf(res)).toEqual(['usuarioId']);
    });

    it('422 com descricao acima de 120 caracteres, e 120 passam', async () => {
      const admin = await asAdmin();
      const user = await insertUser();

      const tooLong = await post(admin, {
        usuarioId: user.id,
        uid: '04A1B2C1',
        descricao: 'a'.repeat(121),
      });
      const limit = await post(admin, {
        usuarioId: user.id,
        uid: '04A1B2C2',
        descricao: 'a'.repeat(120),
      });

      expect(tooLong.status).toBe(422);
      expect(fieldsOf(tooLong)).toEqual(['descricao']);
      expect(limit.status).toBe(201);
    });

    it('409 TAG_JA_CADASTRADA para tag duplicada escrita de outro jeito', async () => {
      const admin = await asAdmin();
      const user = await insertUser();
      await insertNfcTag({ usuarioId: user.id, uid: '04A1B2C3' });

      const res = await post(admin, { usuarioId: user.id, uid: '04-a1-b2-c3' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('TAG_JA_CADASTRADA');
      expect(await prisma.nfcTag.count()).toBe(1);
    });

    it('duas criações simultâneas do mesmo UID resultam em um 201 e um 409', async () => {
      const admin = await asAdmin();
      const user = await insertUser();
      const body = { usuarioId: user.id, uid: '04A1B2C3' };

      const [a, b] = await Promise.all([post(admin, body), post(admin, body)]);

      expect([a.status, b.status].sort()).toEqual([201, 409]);
      const conflict = a.status === 409 ? a : b;
      expect(conflict.body.error.code).toBe('TAG_JA_CADASTRADA');
      expect(await prisma.nfcTag.count()).toBe(1);
    });

    it('404 para usuário inexistente', async () => {
      const admin = await asAdmin();

      const res = await post(admin, { usuarioId: newId(), uid: '04A1B2C3' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('422 para usuário inativo', async () => {
      const admin = await asAdmin();
      const user = await insertUser({ ativo: false });

      const res = await post(admin, { usuarioId: user.id, uid: '04A1B2C3' });

      expect(res.status).toBe(422);
      expect(fieldsOf(res)).toEqual(['usuarioId']);
    });
  });

  describe('GET /nfc-tags', () => {
    it('filtra por usuarioId e por ativa, e traz o usuário de cada tag', async () => {
      const admin = await asAdmin();
      const maria = await insertUser({ nome: 'Maria Souza' });
      const joao = await insertUser({ nome: 'João Lima' });
      await insertNfcTag({ usuarioId: maria.id, uid: '04A1B2C1' });
      await insertNfcTag({ usuarioId: maria.id, uid: '04A1B2C2', ativa: false });
      await insertNfcTag({ usuarioId: joao.id, uid: '04A1B2C3' });

      const byUser = await list(admin, { usuarioId: joao.id });
      const inactive = await list(admin, { ativa: 'false' });
      const both = await list(admin, { usuarioId: maria.id, ativa: 'true' });

      expect(byUser.status).toBe(200);
      expect(byUser.body.data).toHaveLength(1);
      expect(byUser.body.data[0]).toMatchObject({
        uid: '04A1B2C3',
        usuario: { id: joao.id, nome: 'João Lima' },
      });
      expect(inactive.body.data.map((t: { uid: string }) => t.uid)).toEqual(['04A1B2C2']);
      expect(both.body.data.map((t: { uid: string }) => t.uid)).toEqual(['04A1B2C1']);
    });

    it('pagina no formato do contrato, com padrão de página 1 e 20 itens', async () => {
      const admin = await asAdmin();
      const user = await insertUser();
      await insertNfcTag({ usuarioId: user.id, uid: '04A1B2C1' });
      await insertNfcTag({ usuarioId: user.id, uid: '04A1B2C2' });
      await insertNfcTag({ usuarioId: user.id, uid: '04A1B2C3' });

      const standard = await list(admin);
      const second = await list(admin, { page: 2, pageSize: 2 });

      expect(standard.body).toMatchObject({ page: 1, pageSize: 20, total: 3 });
      expect(standard.body.data).toHaveLength(3);
      expect(second.body).toMatchObject({ page: 2, pageSize: 2, total: 3 });
      expect(second.body.data).toHaveLength(1);
    });

    it.each([
      ['usuarioId', 'nao-e-um-id'],
      ['ativa', 'talvez'],
      ['pageSize', '101'],
    ])('422 com %s inválido', async (field, value) => {
      const admin = await asAdmin();

      const res = await list(admin, { [field]: value });

      expect(res.status).toBe(422);
      expect(fieldsOf(res)).toEqual([field]);
    });
  });

  describe('PATCH /nfc-tags/:id', () => {
    it('desativa e reativa, e o valor fica gravado', async () => {
      const admin = await asAdmin();
      const user = await insertUser({ nome: 'Maria Souza' });
      const tag = await insertNfcTag({ usuarioId: user.id, uid: '04A1B2C3' });
      const stored = () => prisma.nfcTag.findUniqueOrThrow({ where: { id: tag.id } });

      const off = await patch(admin, tag.id, { ativa: false });
      expect(off.status).toBe(200);
      expect(off.body).toMatchObject({
        id: tag.id,
        uid: '04A1B2C3',
        ativa: false,
        usuario: { id: user.id, nome: 'Maria Souza' },
      });
      expect((await stored()).ativa).toBe(false);

      const on = await patch(admin, tag.id, { ativa: true });
      expect(on.body.ativa).toBe(true);
      expect((await stored()).ativa).toBe(true);
    });

    it.each([
      ['inexistente', newId()],
      ['malformado', 'nao-e-um-id'],
    ])('404 com id %s', async (_case, id) => {
      const admin = await asAdmin();

      const res = await patch(admin, id, { ativa: false });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('422 com corpo vazio ou ativa que não é booleano', async () => {
      const admin = await asAdmin();
      const tag = await insertNfcTag();

      const empty = await patch(admin, tag.id, {});
      const wrong = await patch(admin, tag.id, { ativa: 'false' });

      expect(empty.status).toBe(422);
      expect(fieldsOf(empty)).toEqual(['ativa']);
      expect(wrong.status).toBe(422);
    });

    it.each(['uid', 'usuarioId', 'descricao'])('422 ao tentar mudar %s', async (field) => {
      const admin = await asAdmin();
      const tag = await insertNfcTag();

      const res = await patch(admin, tag.id, { ativa: false, [field]: 'qualquer' });

      expect(res.status).toBe(422);
      expect((await prisma.nfcTag.findUniqueOrThrow({ where: { id: tag.id } })).ativa).toBe(true);
    });
  });

  describe('permissões', () => {
    it('401 sem token em todas as rotas', async () => {
      const id = newId();

      const results = await Promise.all([
        request(app).post('/api/v1/nfc-tags').send({}),
        request(app).get('/api/v1/nfc-tags'),
        request(app).patch(`/api/v1/nfc-tags/${id}`).send({ ativa: false }),
      ]);

      expect(results.map((r) => r.status)).toEqual([401, 401, 401]);
    });

    it.each(['CONDOMINO', 'VISITANTE'] as const)(
      '403 para %s em todas as rotas',
      async (perfil) => {
        const user = await insertUser({ perfil });
        const tag = await insertNfcTag();

        const results = await Promise.all([
          post(user, { usuarioId: user.id, uid: '04A1B2C3' }),
          list(user),
          patch(user, tag.id, { ativa: false }),
        ]);

        expect(results.map((r) => r.status)).toEqual([403, 403, 403]);
        expect(results.map((r) => r.body.error.code)).toEqual([
          'FORBIDDEN',
          'FORBIDDEN',
          'FORBIDDEN',
        ]);
        expect(await prisma.nfcTag.count()).toBe(1);
      },
    );
  });
});
