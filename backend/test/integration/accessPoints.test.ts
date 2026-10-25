import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import {
  bearer,
  insertAccessPoint,
  insertAuthorization,
  insertBuilding,
  insertUser,
  prisma,
  resetDatabase,
} from './helpers';

const app = createApp();

const asAdmin = () => insertUser({ nome: 'Admin', perfil: 'ADMIN' });

const bodyFor = (buildingId: string, overrides: object = {}) => ({
  buildingId,
  tipo: 'CATRACA',
  nome: 'Catraca Social',
  identificacao: 'CAT-01',
  latitude: -23.30512,
  longitude: -45.96551,
  ...overrides,
});

const post = (admin: Parameters<typeof bearer>[0], body: object) =>
  request(app).post('/api/v1/access-points').set('Authorization', bearer(admin)).send(body);

describe('rotas /api/v1/access-points', () => {
  beforeEach(resetDatabase);

  describe('POST /access-points', () => {
    it('201 com o ponto completo e ativo, e grava no banco', async () => {
      const admin = await asAdmin();
      const building = await insertBuilding();

      const res = await post(admin, bodyFor(building.id));

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: expect.any(String), ...bodyFor(building.id), ativo: true });
      expect(await prisma.accessPoint.count()).toBe(1);
    });

    it.each([
      ['latitude', 91],
      ['latitude', -91],
      ['longitude', 181],
      ['longitude', -181],
    ])('422 com %s fora da faixa (%s) e mensagem no campo', async (field, value) => {
      const admin = await asAdmin();
      const building = await insertBuilding();

      const res = await post(admin, bodyFor(building.id, { [field]: value }));

      expect(res.status).toBe(422);
      expect(res.body.error.details).toEqual([{ field, message: expect.any(String) }]);
      expect(await prisma.accessPoint.count()).toBe(0);
    });

    it('422 com tipo fora dos três valores e com buildingId malformado', async () => {
      const admin = await asAdmin();
      const building = await insertBuilding();

      const badType = await post(admin, bodyFor(building.id, { tipo: 'JANELA' }));
      const badId = await post(admin, bodyFor('nao-e-id'));

      expect(badType.status).toBe(422);
      expect(badType.body.error.details[0].field).toBe('tipo');
      expect(badId.status).toBe(422);
      expect(badId.body.error.details[0].field).toBe('buildingId');
    });

    it('404 para edifício inexistente e 422 no campo buildingId para edifício inativo', async () => {
      const admin = await asAdmin();
      const closed = await insertBuilding({ ativo: false });

      const missing = await post(admin, bodyFor('5eed0000-0000-4000-8000-0000000000ff'));
      const inactive = await post(admin, bodyFor(closed.id));

      expect(missing.status).toBe(404);
      expect(inactive.status).toBe(422);
      expect(inactive.body.error.details).toEqual([
        { field: 'buildingId', message: expect.any(String) },
      ]);
    });

    it('409 CONFLICT para identificação repetida no mesmo edifício, mas 201 em outro edifício', async () => {
      const admin = await asAdmin();
      const building = await insertBuilding();
      const other = await insertBuilding({ nome: 'Outro' });
      await post(admin, bodyFor(building.id));

      const repeated = await post(admin, bodyFor(building.id, { nome: 'Outra' }));
      const elsewhere = await post(admin, bodyFor(other.id));

      expect(repeated.status).toBe(409);
      expect(repeated.body.error.code).toBe('CONFLICT');
      expect(elsewhere.status).toBe(201);
    });

    it('duas criações simultâneas com a mesma identificação dão um 201 e um 409, nunca 500', async () => {
      const admin = await asAdmin();
      const building = await insertBuilding();

      const results = await Promise.all([
        post(admin, bodyFor(building.id)),
        post(admin, bodyFor(building.id)),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(await prisma.accessPoint.count()).toBe(1);
    });
  });

  describe('GET /access-points', () => {
    const seedPoints = async () => {
      const central = await insertBuilding({ nome: 'Central' });
      const anexo = await insertBuilding({ nome: 'Anexo' });
      await insertAccessPoint({ buildingId: central.id, tipo: 'CATRACA', nome: 'Catraca Social' });
      await insertAccessPoint({ buildingId: central.id, tipo: 'PORTARIA', nome: 'Portaria' });
      await insertAccessPoint({
        buildingId: anexo.id,
        tipo: 'CATRACA',
        nome: 'Catraca Anexo',
        ativo: false,
      });
      await insertAccessPoint({ buildingId: anexo.id, tipo: 'PORTA', nome: 'Porta Garagem' });
      return { central, anexo };
    };
    const names = async (admin: Parameters<typeof bearer>[0], query: string) => {
      const res = await request(app)
        .get(`/api/v1/access-points${query}`)
        .set('Authorization', bearer(admin));
      expect(res.status).toBe(200);
      return res.body.data.map((p: { nome: string }) => p.nome);
    };

    it('200 paginado e ordenado por nome', async () => {
      const admin = await asAdmin();
      await seedPoints();

      const res = await request(app)
        .get('/api/v1/access-points')
        .set('Authorization', bearer(admin));

      expect(res.body).toMatchObject({ page: 1, pageSize: 20, total: 4 });
      expect(res.body.data.map((p: { nome: string }) => p.nome)).toEqual([
        'Catraca Anexo',
        'Catraca Social',
        'Porta Garagem',
        'Portaria',
      ]);
    });

    it('filtra por buildingId, tipo e ativo, isolados e combinados', async () => {
      const admin = await asAdmin();
      const { central, anexo } = await seedPoints();

      expect(await names(admin, `?buildingId=${central.id}`)).toEqual([
        'Catraca Social',
        'Portaria',
      ]);
      expect(await names(admin, '?tipo=CATRACA')).toEqual(['Catraca Anexo', 'Catraca Social']);
      expect(await names(admin, '?ativo=false')).toEqual(['Catraca Anexo']);
      expect(await names(admin, `?buildingId=${anexo.id}&tipo=CATRACA&ativo=true`)).toEqual([]);
      expect(await names(admin, `?buildingId=${anexo.id}&tipo=CATRACA&ativo=false`)).toEqual([
        'Catraca Anexo',
      ]);
    });

    it('422 com buildingId malformado ou tipo inválido', async () => {
      const admin = await asAdmin();

      for (const query of ['?buildingId=x', '?tipo=JANELA']) {
        const res = await request(app)
          .get(`/api/v1/access-points${query}`)
          .set('Authorization', bearer(admin));
        expect(res.status).toBe(422);
      }
    });
  });

  describe('PATCH /access-points/:id', () => {
    const patch = (admin: Parameters<typeof bearer>[0], id: string, body: object) =>
      request(app)
        .patch(`/api/v1/access-points/${id}`)
        .set('Authorization', bearer(admin))
        .send(body);

    it('200 alterando só os campos enviados', async () => {
      const admin = await asAdmin();
      const point = await insertAccessPoint();

      const res = await patch(admin, point.id, { nome: 'Novo Nome', tipo: 'PORTA' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: point.id,
        buildingId: point.buildingId,
        tipo: 'PORTA',
        nome: 'Novo Nome',
        identificacao: point.identificacao,
        latitude: point.latitude,
        longitude: point.longitude,
        ativo: true,
      });
    });

    it('404 para ponto inexistente e id malformado', async () => {
      const admin = await asAdmin();

      for (const id of ['5eed0000-0000-4000-8000-0000000000ff', 'nao-e-id']) {
        expect((await patch(admin, id, { nome: 'X' })).status).toBe(404);
      }
    });

    it('422 com buildingId no corpo, campo desconhecido, corpo vazio ou coordenada fora da faixa', async () => {
      const admin = await asAdmin();
      const point = await insertAccessPoint();
      const other = await insertBuilding({ nome: 'Outro' });

      expect((await patch(admin, point.id, { buildingId: other.id })).status).toBe(422);
      expect((await patch(admin, point.id, { foo: 1 })).status).toBe(422);
      expect((await patch(admin, point.id, {})).status).toBe(422);
      expect((await patch(admin, point.id, { latitude: -91 })).status).toBe(422);
      expect(
        (await prisma.accessPoint.findUniqueOrThrow({ where: { id: point.id } })).buildingId,
      ).toBe(point.buildingId);
    });

    it('409 CONFLICT ao trocar para a identificação de outro ponto do mesmo edifício', async () => {
      const admin = await asAdmin();
      const first = await insertAccessPoint({ identificacao: 'CAT-01' });
      const second = await insertAccessPoint({
        buildingId: first.buildingId,
        identificacao: 'CAT-02',
      });

      const res = await patch(admin, second.id, { identificacao: 'CAT-01' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('409 LOCAL_COM_AUTORIZACOES_ATIVAS ao desativar com autorização ativa e vigente', async () => {
      const admin = await asAdmin();
      const point = await insertAccessPoint();
      await insertAuthorization({ accessPointId: point.id, dataFim: new Date('2099-01-01') });

      const res = await patch(admin, point.id, { ativo: false });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('LOCAL_COM_AUTORIZACOES_ATIVAS');
      expect((await prisma.accessPoint.findUniqueOrThrow({ where: { id: point.id } })).ativo).toBe(
        true,
      );
    });

    it('200 ao desativar com autorização expirada ou cancelada', async () => {
      const admin = await asAdmin();
      const point = await insertAccessPoint();
      await insertAuthorization({
        accessPointId: point.id,
        dataInicio: new Date('2019-01-01'),
        dataFim: new Date('2020-01-01'),
      });
      await insertAuthorization({
        accessPointId: point.id,
        dataFim: new Date('2099-01-01'),
        situacao: 'CANCELADA',
      });

      const res = await patch(admin, point.id, { ativo: false });

      expect(res.status).toBe(200);
      expect(res.body.ativo).toBe(false);
    });

    it('422 no campo ativo ao reativar ponto de edifício inativo', async () => {
      const admin = await asAdmin();
      const closed = await insertBuilding({ ativo: false });
      const point = await insertAccessPoint({ buildingId: closed.id, ativo: false });

      const res = await patch(admin, point.id, { ativo: true });

      expect(res.status).toBe(422);
      expect(res.body.error.details).toEqual([{ field: 'ativo', message: expect.any(String) }]);
    });
  });

  describe('permissões', () => {
    it('401 sem token em todas as rotas', async () => {
      const point = await insertAccessPoint();

      const results = await Promise.all([
        request(app).post('/api/v1/access-points').send(bodyFor(point.buildingId)),
        request(app).get('/api/v1/access-points'),
        request(app).patch(`/api/v1/access-points/${point.id}`).send({ nome: 'X' }),
      ]);

      expect(results.map((r) => r.status)).toEqual([401, 401, 401]);
    });

    it.each(['CONDOMINO', 'VISITANTE'] as const)(
      '403 para %s em todas as rotas',
      async (perfil) => {
        const user = await insertUser({ perfil });
        const point = await insertAccessPoint();

        const results = await Promise.all([
          post(user, bodyFor(point.buildingId, { identificacao: 'CAT-99' })),
          request(app).get('/api/v1/access-points').set('Authorization', bearer(user)),
          request(app)
            .patch(`/api/v1/access-points/${point.id}`)
            .set('Authorization', bearer(user))
            .send({ nome: 'X' }),
        ]);

        expect(results.map((r) => r.status)).toEqual([403, 403, 403]);
        expect(await prisma.accessPoint.count()).toBe(1);
      },
    );
  });
});
