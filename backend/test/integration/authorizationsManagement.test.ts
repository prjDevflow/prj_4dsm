import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import {
  bearer,
  insertAccessPoint,
  insertAuthorization,
  insertBuilding,
  insertUser,
  newId,
  prisma,
  resetDatabase,
} from './helpers';

const app = createApp();

type Actor = Parameters<typeof bearer>[0];

async function scenario() {
  const admin = await insertUser({ nome: 'Admin', perfil: 'ADMIN' });
  const owner = await insertUser({ nome: 'Maria Souza', perfil: 'VISITANTE' });
  const stranger = await insertUser({ nome: 'João Alves', perfil: 'CONDOMINO' });
  const building = await insertBuilding({ nome: 'Edifício Central' });
  const point = await insertAccessPoint({ buildingId: building.id, nome: 'Catraca Social' });
  const authorization = await insertAuthorization({
    usuarioId: owner.id,
    accessPointId: point.id,
    criadoPorId: admin.id,
    dataInicio: new Date('2099-01-01'),
    dataFim: new Date('2099-01-05'),
  });
  return { admin, owner, stranger, point, authorization };
}

const cancel = (actor: Actor, id: string, body?: object) =>
  request(app)
    .patch(`/api/v1/authorizations/${id}/cancel`)
    .set('Authorization', bearer(actor))
    .send(body);

const get = (actor: Actor, id: string) =>
  request(app).get(`/api/v1/authorizations/${id}`).set('Authorization', bearer(actor));

const stored = (id: string) => prisma.authorization.findUniqueOrThrow({ where: { id } });

describe('rotas de autorização da B09', () => {
  beforeEach(resetDatabase);

  describe('PATCH /authorizations/:id/cancel', () => {
    it('200 com o objeto cancelado, quem cancelou, quando e o motivo', async () => {
      const { admin, owner, authorization } = await scenario();

      const res = await cancel(admin, authorization.id, { motivo: 'Pedido da moradora' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: authorization.id,
        usuario: { id: owner.id },
        situacao: 'CANCELADA',
        situacaoEfetiva: 'CANCELADA',
        canceladoPor: { id: admin.id, nome: 'Admin' },
        canceladoEm: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
        motivoCancelamento: 'Pedido da moradora',
      });
      expect(await stored(authorization.id)).toMatchObject({
        situacao: 'CANCELADA',
        canceladoPorId: admin.id,
        motivoCancelamento: 'Pedido da moradora',
      });
    });

    it('200 sem corpo, e motivo vazio ou só com espaços vira nulo', async () => {
      const { admin, authorization } = await scenario();
      const second = await insertAuthorization({
        usuarioId: authorization.usuarioId,
        accessPointId: authorization.accessPointId,
        criadoPorId: admin.id,
      });

      const withoutBody = await cancel(admin, authorization.id);
      const blank = await cancel(admin, second.id, { motivo: '   ' });

      expect(withoutBody.status).toBe(200);
      expect(withoutBody.body.motivoCancelamento).toBeNull();
      expect(blank.status).toBe(200);
      expect(blank.body.motivoCancelamento).toBeNull();
    });

    it('cancelar de novo devolve 200 com o estado atual e não altera quem, quando nem o motivo', async () => {
      const { admin, authorization } = await scenario();
      const otherAdmin = await insertUser({ nome: 'Outro Admin', perfil: 'ADMIN' });
      const first = await cancel(admin, authorization.id, { motivo: 'Primeiro' });

      const again = await cancel(otherAdmin, authorization.id, { motivo: 'Segundo' });

      expect(again.status).toBe(200);
      expect(again.body).toEqual(first.body);
      expect(again.body.canceladoPor.id).toBe(admin.id);
    });

    it('vários cancelamentos ao mesmo tempo dão 200 e guardam só o primeiro', async () => {
      const { authorization } = await scenario();
      const admins = await Promise.all(
        Array.from({ length: 8 }, (_, i) => insertUser({ nome: `Admin ${i}`, perfil: 'ADMIN' })),
      );

      const responses = await Promise.all(
        admins.map((a, i) => cancel(a, authorization.id, { motivo: `Motivo ${i}` })),
      );

      expect(responses.map((r) => r.status)).toEqual(Array(8).fill(200));
      const row = await stored(authorization.id);
      const winner = admins.findIndex((a) => a.id === row.canceladoPorId);
      expect(winner).toBeGreaterThanOrEqual(0);
      expect(row.motivoCancelamento).toBe(`Motivo ${winner}`);
      // Every answer shows the same, single cancellation.
      expect(new Set(responses.map((r) => r.body.canceladoEm)).size).toBe(1);
      expect(new Set(responses.map((r) => r.body.canceladoPor.id))).toEqual(
        new Set([row.canceladoPorId]),
      );
    });

    it('cancela também a autorização vencida que ainda está gravada como ATIVA', async () => {
      const { admin, owner, point } = await scenario();
      const expired = await insertAuthorization({
        usuarioId: owner.id,
        accessPointId: point.id,
        criadoPorId: admin.id,
        dataInicio: new Date('2020-01-01'),
        dataFim: new Date('2020-01-31'),
      });

      const res = await cancel(admin, expired.id);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ situacao: 'CANCELADA', situacaoEfetiva: 'CANCELADA' });
    });

    it('401 sem token, e 403 para condômino, visitante e o próprio dono, sem alterar nada', async () => {
      const { owner, stranger, authorization } = await scenario();

      const anonymous = await request(app).patch(
        `/api/v1/authorizations/${authorization.id}/cancel`,
      );
      const asOwner = await cancel(owner, authorization.id);
      const asResident = await cancel(stranger, authorization.id);

      expect(anonymous.status).toBe(401);
      expect(asOwner.status).toBe(403);
      expect(asOwner.body.error.code).toBe('FORBIDDEN');
      expect(asResident.status).toBe(403);
      expect((await stored(authorization.id)).situacao).toBe('ATIVA');
    });

    it('404 para id inexistente e para id malformado', async () => {
      const { admin } = await scenario();

      const missing = await cancel(admin, newId());
      const malformed = await cancel(admin, 'nao-e-id');

      expect(missing.status).toBe(404);
      expect(missing.body.error.code).toBe('NOT_FOUND');
      expect(malformed.status).toBe(404);
    });

    it('422 com motivo de 201 caracteres, e 200 com 200, sem alterar nada no erro', async () => {
      const { admin, authorization } = await scenario();

      const tooLong = await cancel(admin, authorization.id, { motivo: 'a'.repeat(201) });
      const stillActive = (await stored(authorization.id)).situacao;
      const limit = await cancel(admin, authorization.id, { motivo: 'a'.repeat(200) });

      expect(tooLong.status).toBe(422);
      expect(tooLong.body.error.details).toEqual([
        { field: 'motivo', message: expect.any(String) },
      ]);
      expect(stillActive).toBe('ATIVA');
      expect(limit.status).toBe(200);
    });
  });

  describe('GET /authorizations/:id', () => {
    it('200 para o administrador, para o dono, e 404 para outro usuário', async () => {
      const { admin, owner, stranger, authorization } = await scenario();

      const asAdmin = await get(admin, authorization.id);
      const asOwner = await get(owner, authorization.id);
      const asStranger = await get(stranger, authorization.id);

      expect(asAdmin.status).toBe(200);
      expect(asOwner.status).toBe(200);
      expect(asOwner.body).toEqual(asAdmin.body);
      expect(asStranger.status).toBe(404);
    });

    it('teste de vazamento: a negação para outro usuário é igual à de um id que não existe', async () => {
      const { stranger, authorization } = await scenario();

      const others = await get(stranger, authorization.id);
      const missing = await get(stranger, newId());

      expect(others.status).toBe(404);
      expect(others.body).toEqual(missing.body);
      expect(JSON.stringify(others.body)).not.toContain(authorization.id);
    });

    it('401 sem token', async () => {
      const { authorization } = await scenario();

      const anonymous = await request(app).get(`/api/v1/authorizations/${authorization.id}`);

      expect(anonymous.status).toBe(401);
    });
  });
});
