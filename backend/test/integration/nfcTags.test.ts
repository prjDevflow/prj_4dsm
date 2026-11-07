import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import {
  bearer,
  insertNfcTag,
  insertUser,
  newId,
  prisma,
  resetDatabase,
  tokenFor,
} from './helpers';

const app = createApp();

const asAdmin = () => insertUser({ nome: 'Admin', perfil: 'ADMIN' });
type Auth = Parameters<typeof bearer>[0];

const post = (admin: Auth, body: object) =>
  request(app).post('/api/v1/nfc-tags').set('Authorization', bearer(admin)).send(body);
const list = (admin: Auth, query = '') =>
  request(app).get(`/api/v1/nfc-tags${query}`).set('Authorization', bearer(admin));
const patch = (admin: Auth, id: string, body: unknown) =>
  request(app)
    .patch(`/api/v1/nfc-tags/${id}`)
    .set('Authorization', bearer(admin))
    .send(body as object);

const fieldsOf = (res: request.Response) =>
  (res.body.error.details as { field: string }[]).map((d) => d.field);
const at = (day: number) => new Date(`2026-10-${String(day).padStart(2, '0')}T12:00:00.000Z`);

describe('POST /api/v1/nfc-tags', () => {
  beforeEach(resetDatabase);

  it('201 com os seis campos do contrato e o UID normalizado no banco', async () => {
    const admin = await asAdmin();
    const user = await insertUser();

    const res = await post(admin, {
      usuarioId: user.id,
      uid: '04:a1:b2:c3',
      descricao: 'Cartão azul',
    });

    expect(res.status).toBe(201);
    const row = await prisma.nfcTag.findFirstOrThrow();
    expect(row).toMatchObject({
      usuarioId: user.id,
      uid: '04A1B2C3',
      descricao: 'Cartão azul',
      ativa: true,
    });
    expect(res.body).toEqual({
      id: row.id,
      usuarioId: user.id,
      uid: '04A1B2C3',
      descricao: 'Cartão azul',
      ativa: true,
      criadaEm: row.criadaEm.toISOString(),
    });
  });

  it('grava o mesmo UID para 04:a1:b2:c3, 04-A1-B2-C3 e 04a1b2c3', async () => {
    const admin = await asAdmin();
    const user = await insertUser();

    for (const [i, uid] of ['04:a1:b2:c3', '04-A1-B2-C3', '04 a1 b2 c3'].entries()) {
      const res = await post(admin, { usuarioId: user.id, uid });
      expect(res.status, uid).toBe(i === 0 ? 201 : 409);
    }
    expect((await prisma.nfcTag.findMany()).map((t) => t.uid)).toEqual(['04A1B2C3']);
  });

  it('descricao ausente ou em branco vira null, e o texto é aparado', async () => {
    const admin = await asAdmin();
    const user = await insertUser();

    const missing = await post(admin, { usuarioId: user.id, uid: '01000001' });
    const blank = await post(admin, { usuarioId: user.id, uid: '01000002', descricao: '   ' });
    const padded = await post(admin, {
      usuarioId: user.id,
      uid: '01000003',
      descricao: '  Chaveiro  ',
    });

    expect(missing.body.descricao).toBeNull();
    expect(blank.body.descricao).toBeNull();
    expect(padded.body.descricao).toBe('Chaveiro');
  });

  it('422 no campo uid para 7 e 21 caracteres, não hexadecimal, vazio e não texto', async () => {
    const admin = await asAdmin();
    const user = await insertUser();

    for (const uid of ['04A1B2C', '04A1B2C3D4E5F60718AB1', '04A1B2CZ', '', 12345678, null]) {
      const res = await post(admin, { usuarioId: user.id, uid });
      expect(res.status, String(uid)).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(fieldsOf(res)).toEqual(['uid']);
    }
    const missing = await post(admin, { usuarioId: user.id });
    expect(missing.status).toBe(422);
    expect(fieldsOf(missing)).toEqual(['uid']);
    expect(await prisma.nfcTag.count()).toBe(0);
  });

  it('aceita UID de 8 e de 20 caracteres', async () => {
    const admin = await asAdmin();
    const user = await insertUser();

    const short = await post(admin, { usuarioId: user.id, uid: '04A1B2C3' });
    const long = await post(admin, { usuarioId: user.id, uid: '04A1B2C3D4E5F60718AB' });

    expect([short.status, long.status]).toEqual([201, 201]);
  });

  it('422 por campo para usuarioId malformado ou ausente e descricao longa ou com NUL', async () => {
    const admin = await asAdmin();
    const user = await insertUser();

    const badUser = await post(admin, { usuarioId: 'abc', uid: '04A1B2C3' });
    const noUser = await post(admin, { uid: '04A1B2C3' });
    const long = await post(admin, {
      usuarioId: user.id,
      uid: '04A1B2C3',
      descricao: 'x'.repeat(121),
    });
    const nul = await post(admin, { usuarioId: user.id, uid: '04A1B2C3', descricao: 'a\u0000b' });
    const together = await post(admin, { usuarioId: 'abc', uid: 'zz', descricao: 'x'.repeat(121) });

    expect(fieldsOf(badUser)).toEqual(['usuarioId']);
    expect(fieldsOf(noUser)).toEqual(['usuarioId']);
    expect(fieldsOf(long)).toEqual(['descricao']);
    expect(fieldsOf(nul)).toEqual(['descricao']);
    expect(fieldsOf(together).sort()).toEqual(['descricao', 'uid', 'usuarioId']);
    for (const res of [badUser, noUser, long, nul, together]) expect(res.status).toBe(422);
    expect(await prisma.nfcTag.count()).toBe(0);
  });

  it('aceita descricao com exatamente 120 caracteres', async () => {
    const admin = await asAdmin();
    const user = await insertUser();

    const res = await post(admin, {
      usuarioId: user.id,
      uid: '04A1B2C3',
      descricao: 'x'.repeat(120),
    });

    expect(res.status).toBe(201);
  });

  it('409 TAG_JA_CADASTRADA para o UID repetido, mesmo escrito de outro jeito e para outro usuário', async () => {
    const admin = await asAdmin();
    const ana = await insertUser();
    const bruno = await insertUser();
    await post(admin, { usuarioId: ana.id, uid: '04A1B2C3' });

    const res = await post(admin, { usuarioId: bruno.id, uid: '04:a1:b2:c3' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TAG_JA_CADASTRADA');
    expect(typeof res.body.error.message).toBe('string');
    expect(await prisma.nfcTag.count()).toBe(1);
  });

  it('oito pedidos simultâneos com o mesmo UID dão um 201, sete 409 e uma só linha, nunca 500', async () => {
    const admin = await asAdmin();
    const user = await insertUser();

    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        post(admin, { usuarioId: user.id, uid: i % 2 ? '04:a1:b2:c3' : '04A1B2C3' }),
      ),
    );

    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409, 409, 409, 409, 409, 409]);
    expect(await prisma.nfcTag.count()).toBe(1);
  });

  it('404 para usuário inexistente e 422 no campo usuarioId para usuário inativo', async () => {
    const admin = await asAdmin();
    const inactive = await insertUser({ ativo: false });

    const missing = await post(admin, { usuarioId: newId(), uid: '04A1B2C3' });
    const off = await post(admin, { usuarioId: inactive.id, uid: '04A1B2C3' });

    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
    expect(off.status).toBe(422);
    expect(off.body.error.details).toEqual([{ field: 'usuarioId', message: 'Usuário inativo' }]);
    expect(await prisma.nfcTag.count()).toBe(0);
  });
});

describe('GET /api/v1/nfc-tags', () => {
  beforeEach(resetDatabase);

  const seed = async () => {
    const ana = await insertUser({ nome: 'Ana' });
    const bruno = await insertUser({ nome: 'Bruno' });
    // Oldest to newest: t1 (Ana, active), t2 (Bruno, inactive), t3 (Ana, inactive), t4 (Bruno, active).
    await insertNfcTag({ usuarioId: ana.id, uid: '01000001', criadaEm: at(1) });
    await insertNfcTag({ usuarioId: bruno.id, uid: '01000002', criadaEm: at(2), ativa: false });
    await insertNfcTag({ usuarioId: ana.id, uid: '01000003', criadaEm: at(3), ativa: false });
    await insertNfcTag({ usuarioId: bruno.id, uid: '01000004', criadaEm: at(4) });
    return { ana, bruno };
  };
  const uids = (res: request.Response) => (res.body.data as { uid: string }[]).map((t) => t.uid);

  it('200 no formato paginado, da mais nova para a mais antiga, com os seis campos', async () => {
    const admin = await asAdmin();
    await seed();

    const res = await list(admin);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, pageSize: 20, total: 4 });
    expect(uids(res)).toEqual(['01000004', '01000003', '01000002', '01000001']);
    expect(Object.keys(res.body.data[0]).sort()).toEqual(
      ['ativa', 'criadaEm', 'descricao', 'id', 'uid', 'usuarioId'].sort(),
    );
    expect(res.body.data[0].criadaEm).toBe(at(4).toISOString());
  });

  it('200 com lista vazia quando não há tags', async () => {
    const admin = await asAdmin();

    const res = await list(admin);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], page: 1, pageSize: 20, total: 0 });
  });

  it('filtra por usuarioId', async () => {
    const admin = await asAdmin();
    const { ana } = await seed();

    const res = await list(admin, `?usuarioId=${ana.id}`);

    expect(uids(res)).toEqual(['01000003', '01000001']);
    expect(res.body.total).toBe(2);
  });

  it('filtra por ativa=true e por ativa=false', async () => {
    const admin = await asAdmin();
    await seed();

    expect(uids(await list(admin, '?ativa=true'))).toEqual(['01000004', '01000001']);
    expect(uids(await list(admin, '?ativa=false'))).toEqual(['01000003', '01000002']);
  });

  it('combina usuarioId e ativa', async () => {
    const admin = await asAdmin();
    const { bruno } = await seed();

    const res = await list(admin, `?usuarioId=${bruno.id}&ativa=false`);

    expect(uids(res)).toEqual(['01000002']);
    expect(res.body.total).toBe(1);
  });

  it('um usuário sem tags dá lista vazia, sem erro', async () => {
    const admin = await asAdmin();
    await seed();
    const stranger = await insertUser();

    const res = await list(admin, `?usuarioId=${stranger.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('pagina com page e pageSize e mantém o total', async () => {
    const admin = await asAdmin();
    await seed();

    const res = await list(admin, '?page=2&pageSize=3');

    expect(uids(res)).toEqual(['01000001']);
    expect(res.body).toMatchObject({ page: 2, pageSize: 3, total: 4 });
  });

  it('422 por campo para filtro malformado e paginação fora da faixa', async () => {
    const admin = await asAdmin();

    const badUser = await list(admin, '?usuarioId=abc');
    const badActive = await list(admin, '?ativa=talvez');
    const bigPage = await list(admin, '?pageSize=101');
    const zeroPage = await list(admin, '?page=0');

    expect(fieldsOf(badUser)).toEqual(['usuarioId']);
    expect(fieldsOf(badActive)).toEqual(['ativa']);
    expect(fieldsOf(bigPage)).toEqual(['pageSize']);
    expect(fieldsOf(zeroPage)).toEqual(['page']);
    for (const res of [badUser, badActive, bigPage, zeroPage]) expect(res.status).toBe(422);
  });
});

describe('PATCH /api/v1/nfc-tags/:id', () => {
  beforeEach(resetDatabase);

  it('200 desativa e reativa, mudando só a coluna ativa', async () => {
    const admin = await asAdmin();
    const tag = await insertNfcTag({ uid: '04A1B2C3D4', descricao: 'Cartão azul' });

    const off = await patch(admin, tag.id, { ativa: false });
    const afterOff = await prisma.nfcTag.findUniqueOrThrow({ where: { id: tag.id } });
    const on = await patch(admin, tag.id, { ativa: true });
    const afterOn = await prisma.nfcTag.findUniqueOrThrow({ where: { id: tag.id } });

    expect(off.status).toBe(200);
    expect(off.body).toEqual({ ...tag, criadaEm: tag.criadaEm.toISOString(), ativa: false });
    expect(afterOff).toEqual({ ...tag, ativa: false });
    expect(on.status).toBe(200);
    expect(on.body.ativa).toBe(true);
    expect(afterOn).toEqual(tag);
  });

  it('200 ao repetir o estado que a tag já tem', async () => {
    const admin = await asAdmin();
    const tag = await insertNfcTag();

    const res = await patch(admin, tag.id, { ativa: true });

    expect(res.status).toBe(200);
    expect(res.body.ativa).toBe(true);
  });

  it('422 para corpo vazio, ativa que não é booleano, uid, usuarioId ou campo desconhecido, sem mudar nada', async () => {
    const admin = await asAdmin();
    const tag = await insertNfcTag({ uid: '04A1B2C3D4' });

    const bodies = [
      {},
      { ativa: 'sim' },
      { ativa: null },
      { uid: '05B2C3D4E5' },
      { usuarioId: newId() },
      { descricao: 'outra' },
      { ativa: false, uid: '05B2C3D4E5' },
    ];
    for (const body of bodies) {
      const res = await patch(admin, tag.id, body);
      expect(res.status, JSON.stringify(body)).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
    expect(await prisma.nfcTag.findUniqueOrThrow({ where: { id: tag.id } })).toEqual(tag);
  });

  it('404 para tag inexistente e para id malformado', async () => {
    const admin = await asAdmin();

    const missing = await patch(admin, newId(), { ativa: false });
    const malformed = await patch(admin, 'abc', { ativa: false });

    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
    expect(malformed.status).toBe(404);
    expect(malformed.body.error.code).toBe('NOT_FOUND');
  });
});

describe('permissões das rotas de tags NFC', () => {
  beforeEach(resetDatabase);

  const callAll = async (authorization?: string) => {
    const tag = await insertNfcTag();
    const terminalId = newId();
    const send = (req: request.Test) =>
      authorization ? req.set('Authorization', authorization) : req;
    return Promise.all([
      send(request(app).post('/api/v1/nfc-tags')).send({
        usuarioId: tag.usuarioId,
        uid: '05B2C3D4',
      }),
      send(request(app).get('/api/v1/nfc-tags')),
      send(request(app).patch(`/api/v1/nfc-tags/${tag.id}`)).send({ ativa: false }),
      send(request(app).post(`/api/v1/terminals/${terminalId}/enroll-mode`)).send({
        usuarioId: tag.usuarioId,
      }),
    ]);
  };

  it('401 sem token em todas as rotas, sem criar nem mudar nada', async () => {
    const results = await callAll();

    expect(results.map((r) => r.status)).toEqual([401, 401, 401, 401]);
    expect(await prisma.nfcTag.count()).toBe(1);
  });

  it.each(['CONDOMINO', 'VISITANTE'] as const)('403 para %s em todas as rotas', async (perfil) => {
    const user = await insertUser({ perfil });

    const results = await callAll(`Bearer ${tokenFor(user)}`);

    expect(results.map((r) => r.status)).toEqual([403, 403, 403, 403]);
    for (const res of results) expect(res.body.error.code).toBe('FORBIDDEN');
    const row = await prisma.nfcTag.findFirstOrThrow();
    expect(row.ativa).toBe(true);
    expect(await prisma.nfcTag.count()).toBe(1);
  });
});

describe('tags NFC não se apagam', () => {
  beforeEach(resetDatabase);

  it('DELETE, PUT e GET por id não existem (404)', async () => {
    const admin = await asAdmin();
    const tag = await insertNfcTag();
    const auth = bearer(admin);

    const results = await Promise.all([
      request(app).delete(`/api/v1/nfc-tags/${tag.id}`).set('Authorization', auth),
      request(app).put(`/api/v1/nfc-tags/${tag.id}`).set('Authorization', auth).send({}),
      request(app).get(`/api/v1/nfc-tags/${tag.id}`).set('Authorization', auth),
    ]);

    expect(results.map((r) => r.status)).toEqual([404, 404, 404]);
    expect(await prisma.nfcTag.count()).toBe(1);
  });
});
