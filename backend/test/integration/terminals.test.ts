import { createHash } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import {
  bearer,
  insertAccessPoint,
  insertBuilding,
  insertTerminal,
  insertUser,
  prisma,
  resetDatabase,
} from './helpers';

const app = createApp();

const asAdmin = () => insertUser({ nome: 'Admin', perfil: 'ADMIN' });
const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const KEY_FORMAT = /^[A-Za-z0-9_-]{43}$/;

const post = (admin: Parameters<typeof bearer>[0], body: object) =>
  request(app).post('/api/v1/terminals').set('Authorization', bearer(admin)).send(body);

describe('rotas /api/v1/terminals', () => {
  beforeEach(resetDatabase);

  describe('POST /terminals', () => {
    it('201 com só id e apiKey (32 bytes em base64url) e o banco guarda apenas o SHA-256', async () => {
      const admin = await asAdmin();
      const point = await insertAccessPoint();

      const res = await post(admin, { accessPointId: point.id, nome: 'Terminal Social' });

      expect(res.status).toBe(201);
      expect(Object.keys(res.body).sort()).toEqual(['apiKey', 'id']);
      expect(res.body.apiKey).toMatch(KEY_FORMAT);
      const saved = await prisma.terminal.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(saved).toMatchObject({
        accessPointId: point.id,
        nome: 'Terminal Social',
        ativo: true,
      });
      expect(saved.apiKeyHash).toBe(sha256(res.body.apiKey));
      expect(saved.apiKeyHash).not.toContain(res.body.apiKey);
    });

    it('gera uma chave diferente para cada terminal', async () => {
      const admin = await asAdmin();
      const a = await insertAccessPoint();
      const b = await insertAccessPoint({ buildingId: a.buildingId });

      const first = await post(admin, { accessPointId: a.id, nome: 'A' });
      const second = await post(admin, { accessPointId: b.id, nome: 'B' });

      expect(first.body.apiKey).not.toBe(second.body.apiKey);
    });

    it('409 CONFLICT para o segundo terminal no mesmo ponto de acesso', async () => {
      const admin = await asAdmin();
      const point = await insertAccessPoint();
      await post(admin, { accessPointId: point.id, nome: 'Primeiro' });

      const res = await post(admin, { accessPointId: point.id, nome: 'Segundo' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(await prisma.terminal.count()).toBe(1);
    });

    it('duas criações simultâneas no mesmo ponto dão um 201 e um 409, nunca 500', async () => {
      const admin = await asAdmin();
      const point = await insertAccessPoint();

      const results = await Promise.all([
        post(admin, { accessPointId: point.id, nome: 'A' }),
        post(admin, { accessPointId: point.id, nome: 'B' }),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(await prisma.terminal.count()).toBe(1);
    });

    it('404 para ponto inexistente, 422 no campo accessPointId para inativo e para id malformado', async () => {
      const admin = await asAdmin();
      const closed = await insertAccessPoint({ ativo: false });

      const missing = await post(admin, {
        accessPointId: '5eed0000-0000-4000-8000-0000000000ff',
        nome: 'T',
      });
      const inactive = await post(admin, { accessPointId: closed.id, nome: 'T' });
      const malformed = await post(admin, { accessPointId: 'x', nome: 'T' });

      expect(missing.status).toBe(404);
      expect(inactive.status).toBe(422);
      expect(inactive.body.error.details).toEqual([
        { field: 'accessPointId', message: expect.any(String) },
      ]);
      expect(malformed.status).toBe(422);
      expect(malformed.body.error.details[0].field).toBe('accessPointId');
    });

    it('422 sem nome', async () => {
      const admin = await asAdmin();
      const point = await insertAccessPoint();

      const res = await post(admin, { accessPointId: point.id });

      expect(res.status).toBe(422);
      expect(res.body.error.details[0].field).toBe('nome');
    });
  });

  describe('GET /terminals e GET /terminals/:id', () => {
    it('nunca expõem a apiKey nem o hash dela', async () => {
      const admin = await asAdmin();
      const created = await post(admin, {
        accessPointId: (await insertAccessPoint()).id,
        nome: 'Terminal Social',
      });
      const hash = sha256(created.body.apiKey);

      const list = await request(app).get('/api/v1/terminals').set('Authorization', bearer(admin));
      const one = await request(app)
        .get(`/api/v1/terminals/${created.body.id}`)
        .set('Authorization', bearer(admin));

      for (const res of [list, one]) {
        expect(res.status).toBe(200);
        const text = JSON.stringify(res.body);
        expect(text).not.toContain(created.body.apiKey);
        expect(text).not.toContain(hash);
        expect(text).not.toMatch(/apiKey/i);
      }
      expect(one.body).toEqual({
        id: created.body.id,
        accessPointId: expect.any(String),
        nome: 'Terminal Social',
        ativo: true,
        online: false,
        ultimoContatoEm: null,
        ultimaLat: null,
        ultimaLon: null,
        gpsFix: false,
        gpsSimulado: false,
        firmware: null,
        rssi: null,
      });
    });

    it('indica online com contato recente e offline com contato velho ou nenhum', async () => {
      const admin = await asAdmin();
      const building = await insertBuilding();
      const point = (nome: string) => insertAccessPoint({ buildingId: building.id, nome });
      await insertTerminal({
        nome: 'A recente',
        accessPointId: (await point('p1')).id,
        ultimoContatoEm: new Date(Date.now() - 10_000),
      });
      await insertTerminal({
        nome: 'B velho',
        accessPointId: (await point('p2')).id,
        ultimoContatoEm: new Date(Date.now() - 5 * 60_000),
      });
      await insertTerminal({ nome: 'C nunca', accessPointId: (await point('p3')).id });

      const res = await request(app).get('/api/v1/terminals').set('Authorization', bearer(admin));

      expect(res.body.total).toBe(3);
      expect(
        res.body.data.map((t: { nome: string; online: boolean }) => [t.nome, t.online]),
      ).toEqual([
        ['A recente', true],
        ['B velho', false],
        ['C nunca', false],
      ]);
    });

    it('404 para terminal inexistente e id malformado', async () => {
      const admin = await asAdmin();

      for (const id of ['5eed0000-0000-4000-8000-0000000000ff', 'nao-e-id']) {
        const res = await request(app)
          .get(`/api/v1/terminals/${id}`)
          .set('Authorization', bearer(admin));
        expect(res.status).toBe(404);
      }
    });
  });

  describe('PATCH /terminals/:id', () => {
    it('200 alterando nome e ativo sem mexer na chave', async () => {
      const admin = await asAdmin();
      const terminal = await insertTerminal();

      const res = await request(app)
        .patch(`/api/v1/terminals/${terminal.id}`)
        .set('Authorization', bearer(admin))
        .send({ nome: 'Novo Nome', ativo: false });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: terminal.id, nome: 'Novo Nome', ativo: false });
      expect(JSON.stringify(res.body)).not.toMatch(/apiKey/i);
      const saved = await prisma.terminal.findUniqueOrThrow({ where: { id: terminal.id } });
      expect(saved.apiKeyHash).toBe(terminal.apiKeyHash);
    });

    it('422 com accessPointId, apiKey, campo desconhecido ou corpo vazio; 404 para inexistente', async () => {
      const admin = await asAdmin();
      const terminal = await insertTerminal();
      const patch = (id: string, body: object) =>
        request(app)
          .patch(`/api/v1/terminals/${id}`)
          .set('Authorization', bearer(admin))
          .send(body);

      expect((await patch(terminal.id, { accessPointId: terminal.accessPointId })).status).toBe(
        422,
      );
      expect((await patch(terminal.id, { apiKey: 'x' })).status).toBe(422);
      expect((await patch(terminal.id, {})).status).toBe(422);
      expect((await patch('5eed0000-0000-4000-8000-0000000000ff', { nome: 'X' })).status).toBe(404);
    });
  });

  describe('POST /terminals/:id/rotate-key', () => {
    it('200 com id e a chave nova, e o banco troca o hash', async () => {
      const admin = await asAdmin();
      const created = await post(admin, {
        accessPointId: (await insertAccessPoint()).id,
        nome: 'Terminal Social',
      });

      const res = await request(app)
        .post(`/api/v1/terminals/${created.body.id}/rotate-key`)
        .set('Authorization', bearer(admin));

      expect(res.status).toBe(200);
      expect(Object.keys(res.body).sort()).toEqual(['apiKey', 'id']);
      expect(res.body.id).toBe(created.body.id);
      expect(res.body.apiKey).toMatch(KEY_FORMAT);
      expect(res.body.apiKey).not.toBe(created.body.apiKey);
      const saved = await prisma.terminal.findUniqueOrThrow({ where: { id: created.body.id } });
      expect(saved.apiKeyHash).toBe(sha256(res.body.apiKey));
    });

    it('404 para terminal inexistente e id malformado', async () => {
      const admin = await asAdmin();

      for (const id of ['5eed0000-0000-4000-8000-0000000000ff', 'nao-e-id']) {
        const res = await request(app)
          .post(`/api/v1/terminals/${id}/rotate-key`)
          .set('Authorization', bearer(admin));
        expect(res.status).toBe(404);
      }
    });
  });

  describe('permissões', () => {
    it('401 sem token em todas as rotas', async () => {
      const terminal = await insertTerminal();
      const id = terminal.id;

      const results = await Promise.all([
        request(app)
          .post('/api/v1/terminals')
          .send({ accessPointId: terminal.accessPointId, nome: 'T' }),
        request(app).get('/api/v1/terminals'),
        request(app).get(`/api/v1/terminals/${id}`),
        request(app).patch(`/api/v1/terminals/${id}`).send({ nome: 'X' }),
        request(app).post(`/api/v1/terminals/${id}/rotate-key`),
      ]);

      expect(results.map((r) => r.status)).toEqual([401, 401, 401, 401, 401]);
    });

    it.each(['CONDOMINO', 'VISITANTE'] as const)(
      '403 para %s em todas as rotas',
      async (perfil) => {
        const user = await insertUser({ perfil });
        const terminal = await insertTerminal();
        const free = await insertAccessPoint({ buildingId: (await insertBuilding()).id });
        const id = terminal.id;
        const auth = bearer(user);

        const results = await Promise.all([
          request(app)
            .post('/api/v1/terminals')
            .set('Authorization', auth)
            .send({ accessPointId: free.id, nome: 'T' }),
          request(app).get('/api/v1/terminals').set('Authorization', auth),
          request(app).get(`/api/v1/terminals/${id}`).set('Authorization', auth),
          request(app)
            .patch(`/api/v1/terminals/${id}`)
            .set('Authorization', auth)
            .send({ nome: 'X' }),
          request(app).post(`/api/v1/terminals/${id}/rotate-key`).set('Authorization', auth),
        ]);

        expect(results.map((r) => r.status)).toEqual([403, 403, 403, 403, 403]);
        const unchanged = await prisma.terminal.findUniqueOrThrow({ where: { id } });
        expect(unchanged.apiKeyHash).toBe(terminal.apiKeyHash);
        expect(await prisma.terminal.count()).toBe(1);
      },
    );
  });
});
