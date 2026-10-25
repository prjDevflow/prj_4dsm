import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import {
  bearer,
  insertAccessPoint,
  insertAuthorization,
  insertBuilding,
  insertTerminal,
  insertUser,
  prisma,
  resetDatabase,
} from './helpers';

const app = createApp();

const validBody = {
  nome: 'Edifício Central',
  endereco: 'Rua das Acácias, 120',
  latitude: -23.30512,
  longitude: -45.96551,
};

const asAdmin = () => insertUser({ nome: 'Admin', perfil: 'ADMIN' });

describe('rotas /api/v1/buildings', () => {
  beforeEach(resetDatabase);

  describe('POST /buildings', () => {
    it('201 com o edifício completo e ativo, e grava no banco', async () => {
      const admin = await asAdmin();

      const res = await request(app)
        .post('/api/v1/buildings')
        .set('Authorization', bearer(admin))
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: expect.any(String), ...validBody, ativo: true });
      expect(await prisma.building.findUniqueOrThrow({ where: { id: res.body.id } })).toMatchObject(
        validBody,
      );
    });

    it('201 com os limites exatos das coordenadas', async () => {
      const admin = await asAdmin();

      for (const [latitude, longitude] of [
        [90, 180],
        [-90, -180],
      ]) {
        const res = await request(app)
          .post('/api/v1/buildings')
          .set('Authorization', bearer(admin))
          .send({ ...validBody, latitude, longitude });
        expect(res.status).toBe(201);
      }
    });

    it.each([
      ['latitude', 90.0001],
      ['latitude', -90.0001],
      ['longitude', 180.0001],
      ['longitude', -180.0001],
    ])('422 com %s fora da faixa (%s) e mensagem no campo', async (field, value) => {
      const admin = await asAdmin();

      const res = await request(app)
        .post('/api/v1/buildings')
        .set('Authorization', bearer(admin))
        .send({ ...validBody, [field]: value });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual([{ field, message: expect.any(String) }]);
      expect(await prisma.building.count()).toBe(0);
    });

    it('422 por campo quando faltam campos, o nome é vazio ou tem byte NUL', async () => {
      const admin = await asAdmin();

      const res = await request(app)
        .post('/api/v1/buildings')
        .set('Authorization', bearer(admin))
        .send({ nome: 'a\0b', latitude: 'x' });

      expect(res.status).toBe(422);
      const fields = res.body.error.details.map((d: { field: string }) => d.field).sort();
      expect(fields).toEqual(['endereco', 'latitude', 'longitude', 'nome']);
    });
  });

  describe('GET /buildings', () => {
    it('200 paginado, ordenado por nome, com filtro por ativo', async () => {
      const admin = await asAdmin();
      await insertBuilding({ nome: 'Carlos' });
      await insertBuilding({ nome: 'Ana', ativo: false });
      await insertBuilding({ nome: 'Bruno' });

      const all = await request(app).get('/api/v1/buildings').set('Authorization', bearer(admin));
      const inactive = await request(app)
        .get('/api/v1/buildings?ativo=false')
        .set('Authorization', bearer(admin));
      const page2 = await request(app)
        .get('/api/v1/buildings?page=2&pageSize=2')
        .set('Authorization', bearer(admin));

      expect(all.status).toBe(200);
      expect(all.body).toMatchObject({ page: 1, pageSize: 20, total: 3 });
      expect(all.body.data.map((b: { nome: string }) => b.nome)).toEqual([
        'Ana',
        'Bruno',
        'Carlos',
      ]);
      expect(inactive.body.data.map((b: { nome: string }) => b.nome)).toEqual(['Ana']);
      expect(page2.body.data.map((b: { nome: string }) => b.nome)).toEqual(['Carlos']);
    });

    it('422 com ativo que não é true nem false', async () => {
      const admin = await asAdmin();

      const res = await request(app)
        .get('/api/v1/buildings?ativo=talvez')
        .set('Authorization', bearer(admin));

      expect(res.status).toBe(422);
    });
  });

  describe('PATCH /buildings/:id', () => {
    it('200 alterando só os campos enviados', async () => {
      const admin = await asAdmin();
      const building = await insertBuilding();

      const res = await request(app)
        .patch(`/api/v1/buildings/${building.id}`)
        .set('Authorization', bearer(admin))
        .send({ nome: 'Novo Nome', latitude: 10 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: building.id,
        nome: 'Novo Nome',
        endereco: building.endereco,
        latitude: 10,
        longitude: building.longitude,
        ativo: true,
      });
    });

    it('404 para edifício inexistente e para id malformado', async () => {
      const admin = await asAdmin();

      for (const id of ['5eed0000-0000-4000-8000-0000000000ff', 'nao-e-id']) {
        const res = await request(app)
          .patch(`/api/v1/buildings/${id}`)
          .set('Authorization', bearer(admin))
          .send({ nome: 'X' });
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
      }
    });

    it('422 com campo desconhecido, corpo vazio ou coordenada fora da faixa', async () => {
      const admin = await asAdmin();
      const building = await insertBuilding();
      const patch = (body: object) =>
        request(app)
          .patch(`/api/v1/buildings/${building.id}`)
          .set('Authorization', bearer(admin))
          .send(body);

      expect((await patch({ id: 'x' })).status).toBe(422);
      const empty = await patch({});
      expect(empty.status).toBe(422);
      expect(empty.body.error.details).toEqual([{ field: 'corpo', message: expect.any(String) }]);
      expect((await patch({ longitude: 181 })).status).toBe(422);
    });

    it('409 LOCAL_COM_AUTORIZACOES_ATIVAS ao desativar com autorização ativa e vigente, sem mudar nada', async () => {
      const admin = await asAdmin();
      const building = await insertBuilding();
      const point = await insertAccessPoint({ buildingId: building.id });
      await insertAuthorization({ accessPointId: point.id, dataFim: new Date('2099-01-01') });

      const res = await request(app)
        .patch(`/api/v1/buildings/${building.id}`)
        .set('Authorization', bearer(admin))
        .send({ ativo: false });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('LOCAL_COM_AUTORIZACOES_ATIVAS');
      expect((await prisma.building.findUniqueOrThrow({ where: { id: building.id } })).ativo).toBe(
        true,
      );
      expect((await prisma.accessPoint.findUniqueOrThrow({ where: { id: point.id } })).ativo).toBe(
        true,
      );
    });

    it('200 ao desativar: o edifício e todos os pontos dele ficam inativos, os terminais e outros edifícios não', async () => {
      const admin = await asAdmin();
      const building = await insertBuilding();
      const other = await insertBuilding({ nome: 'Outro' });
      const point = await insertAccessPoint({ buildingId: building.id });
      const point2 = await insertAccessPoint({ buildingId: building.id });
      const otherPoint = await insertAccessPoint({ buildingId: other.id });
      const terminal = await insertTerminal({ accessPointId: point.id });
      // Expired and cancelled permissions do not block.
      await insertAuthorization({
        accessPointId: point.id,
        dataInicio: new Date('2019-01-01'),
        dataFim: new Date('2020-01-01'),
      });
      await insertAuthorization({
        accessPointId: point2.id,
        dataFim: new Date('2099-01-01'),
        situacao: 'CANCELADA',
      });

      const res = await request(app)
        .patch(`/api/v1/buildings/${building.id}`)
        .set('Authorization', bearer(admin))
        .send({ ativo: false });

      expect(res.status).toBe(200);
      expect(res.body.ativo).toBe(false);
      const states = await prisma.accessPoint.findMany({ select: { id: true, ativo: true } });
      expect(Object.fromEntries(states.map((p) => [p.id, p.ativo]))).toEqual({
        [point.id]: false,
        [point2.id]: false,
        [otherPoint.id]: true,
      });
      expect((await prisma.terminal.findUniqueOrThrow({ where: { id: terminal.id } })).ativo).toBe(
        true,
      );
    });
  });

  describe('permissões', () => {
    it('401 sem token em todas as rotas', async () => {
      const building = await insertBuilding();

      const results = await Promise.all([
        request(app).post('/api/v1/buildings').send(validBody),
        request(app).get('/api/v1/buildings'),
        request(app).patch(`/api/v1/buildings/${building.id}`).send({ nome: 'X' }),
      ]);

      expect(results.map((r) => r.status)).toEqual([401, 401, 401]);
    });

    it.each(['CONDOMINO', 'VISITANTE'] as const)(
      '403 para %s em todas as rotas',
      async (perfil) => {
        const user = await insertUser({ perfil });
        const building = await insertBuilding();

        const results = await Promise.all([
          request(app).post('/api/v1/buildings').set('Authorization', bearer(user)).send(validBody),
          request(app).get('/api/v1/buildings').set('Authorization', bearer(user)),
          request(app)
            .patch(`/api/v1/buildings/${building.id}`)
            .set('Authorization', bearer(user))
            .send({ nome: 'X' }),
        ]);

        expect(results.map((r) => r.status)).toEqual([403, 403, 403]);
        expect(results[0]?.body.error.code).toBe('FORBIDDEN');
        expect(await prisma.building.count()).toBe(1);
      },
    );
  });
});
