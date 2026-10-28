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

// The integration tests use the system clock, so the period sits far in the future.
const bodyFor = (usuarioId: string, accessPointId: string, overrides: object = {}) => ({
  usuarioId,
  accessPointId,
  dataInicio: '2099-01-01',
  dataFim: '2099-01-05',
  horaInicio: '08:00',
  horaFim: '18:00',
  usosPermitidos: 3,
  ...overrides,
});

const asAdmin = () => insertUser({ nome: 'Admin', perfil: 'ADMIN' });

async function scenario() {
  const admin = await asAdmin();
  const visitor = await insertUser({ nome: 'Maria Souza', perfil: 'VISITANTE' });
  const building = await insertBuilding({ nome: 'Edifício Central' });
  const point = await insertAccessPoint({ buildingId: building.id, nome: 'Catraca Social' });
  return { admin, visitor, building, point };
}

const post = (user: Parameters<typeof bearer>[0], body: object) =>
  request(app).post('/api/v1/authorizations').set('Authorization', bearer(user)).send(body);

const get = (user: Parameters<typeof bearer>[0], id: string) =>
  request(app).get(`/api/v1/authorizations/${id}`).set('Authorization', bearer(user));

describe('rotas /api/v1/authorizations', () => {
  beforeEach(resetDatabase);

  describe('POST /authorizations', () => {
    it('201 com o objeto completo do contrato', async () => {
      const { admin, visitor, building, point } = await scenario();

      const res = await post(admin, bodyFor(visitor.id, point.id));

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: expect.any(String),
        usuario: { id: visitor.id, nome: 'Maria Souza', perfil: 'VISITANTE' },
        local: {
          id: point.id,
          nome: 'Catraca Social',
          tipo: 'CATRACA',
          edificio: { id: building.id, nome: 'Edifício Central' },
        },
        dataInicio: '2099-01-01',
        dataFim: '2099-01-05',
        horaInicio: '08:00',
        horaFim: '18:00',
        usosPermitidos: 3,
        usosRealizados: 0,
        usosRestantes: 3,
        situacao: 'ATIVA',
        situacaoEfetiva: 'ATIVA',
        criadoPor: { id: admin.id, nome: 'Admin' },
        criadoEm: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
        canceladoPor: null,
        canceladoEm: null,
        motivoCancelamento: null,
      });
    });

    it('grava os oito campos, o autor do token e zero usos, sem deslocar as datas', async () => {
      const { admin, visitor, point } = await scenario();

      const res = await post(admin, bodyFor(visitor.id, point.id));

      const row = await prisma.authorization.findUniqueOrThrow({ where: { id: res.body.id } });
      expect(row).toMatchObject({
        usuarioId: visitor.id,
        accessPointId: point.id,
        horaInicio: '08:00',
        horaFim: '18:00',
        usosPermitidos: 3,
        usosRealizados: 0,
        situacao: 'ATIVA',
        criadoPorId: admin.id,
        canceladoPorId: null,
      });
      expect(row.dataInicio.toISOString().slice(0, 10)).toBe('2099-01-01');
      expect(row.dataFim.toISOString().slice(0, 10)).toBe('2099-01-05');
      expect(Math.abs(row.criadoEm.getTime() - Date.now())).toBeLessThan(60_000);
    });

    it('ignora criadoPorId e situacao enviados no corpo', async () => {
      const { admin, visitor, point } = await scenario();
      const other = await insertUser({ perfil: 'ADMIN' });

      const res = await post(
        admin,
        bodyFor(visitor.id, point.id, {
          criadoPorId: other.id,
          situacao: 'CANCELADA',
          usosRealizados: 3,
        }),
      );

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        criadoPor: { id: admin.id },
        situacao: 'ATIVA',
        usosRealizados: 0,
      });
    });

    it.each([0, 1001, 1.5, -1, '3'])(
      '422 com usosPermitidos %s e mensagem no campo',
      async (usosPermitidos) => {
        const { admin, visitor, point } = await scenario();

        const res = await post(admin, bodyFor(visitor.id, point.id, { usosPermitidos }));

        expect(res.status).toBe(422);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
        expect(res.body.error.details).toEqual([
          { field: 'usosPermitidos', message: expect.any(String) },
        ]);
        expect(await prisma.authorization.count()).toBe(0);
      },
    );

    it.each([1, 1000])('201 com usosPermitidos no limite (%s)', async (usosPermitidos) => {
      const { admin, visitor, point } = await scenario();

      const res = await post(admin, bodyFor(visitor.id, point.id, { usosPermitidos }));

      expect(res.status).toBe(201);
      expect(res.body.usosRestantes).toBe(usosPermitidos);
    });

    it.each([
      ['dataInicio', '2099-02-30'],
      ['dataFim', '20/01/2099'],
      ['dataFim', '2099-13-01'],
      ['horaInicio', '8:00'],
      ['horaFim', '24:00'],
      ['horaFim', '18:60'],
      ['usuarioId', 'nao-e-id'],
      ['accessPointId', 'nao-e-id'],
    ])('422 com %s inválido (%s) e mensagem no campo', async (field, value) => {
      const { admin, visitor, point } = await scenario();

      const res = await post(admin, bodyFor(visitor.id, point.id, { [field]: value }));

      expect(res.status).toBe(422);
      expect(res.body.error.details).toEqual([{ field, message: expect.any(String) }]);
      expect(await prisma.authorization.count()).toBe(0);
    });

    it('422 com um details por campo quando o corpo está vazio', async () => {
      const { admin } = await scenario();

      const res = await post(admin, {});

      expect(res.status).toBe(422);
      expect(res.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual([
        'accessPointId',
        'dataFim',
        'dataInicio',
        'horaFim',
        'horaInicio',
        'usosPermitidos',
        'usuarioId',
      ]);
    });

    it('401 sem token, e 403 para condômino e visitante, sem criar nada', async () => {
      const { visitor, point } = await scenario();
      const resident = await insertUser({ perfil: 'CONDOMINO' });
      const body = bodyFor(visitor.id, point.id);

      const anonymous = await request(app).post('/api/v1/authorizations').send(body);
      const asResident = await post(resident, body);
      const asVisitor = await post(visitor, body);

      expect(anonymous.status).toBe(401);
      expect(asResident.status).toBe(403);
      expect(asVisitor.status).toBe(403);
      expect(asVisitor.body.error.code).toBe('FORBIDDEN');
      expect(await prisma.authorization.count()).toBe(0);
    });

    it('404 quando o usuário ou o ponto de acesso não existe', async () => {
      const { admin, visitor, point } = await scenario();

      const noUser = await post(admin, bodyFor(newId(), point.id));
      const noPoint = await post(admin, bodyFor(visitor.id, newId()));

      expect(noUser.status).toBe(404);
      expect(noUser.body.error.code).toBe('NOT_FOUND');
      expect(noPoint.status).toBe(404);
      expect(await prisma.authorization.count()).toBe(0);
    });

    it('422 no campo certo quando o usuário ou o ponto está inativo', async () => {
      const { admin, visitor, point } = await scenario();
      const inactiveUser = await insertUser({ ativo: false });
      const inactivePoint = await insertAccessPoint({ ativo: false });

      const user = await post(admin, bodyFor(inactiveUser.id, point.id));
      const place = await post(admin, bodyFor(visitor.id, inactivePoint.id));

      expect(user.status).toBe(422);
      expect(user.body.error.details).toEqual([
        { field: 'usuarioId', message: 'Usuário inativo' },
      ]);
      expect(place.status).toBe(422);
      expect(place.body.error.details).toEqual([
        { field: 'accessPointId', message: 'Ponto de acesso inativo' },
      ]);
      expect(await prisma.authorization.count()).toBe(0);
    });

    it('422 com dataFim anterior a dataInicio, dataFim no passado e horaFim igual a horaInicio', async () => {
      const { admin, visitor, point } = await scenario();

      const reversed = await post(
        admin,
        bodyFor(visitor.id, point.id, { dataInicio: '2099-01-05', dataFim: '2099-01-04' }),
      );
      const past = await post(
        admin,
        bodyFor(visitor.id, point.id, { dataInicio: '2020-01-01', dataFim: '2020-01-02' }),
      );
      const sameTime = await post(
        admin,
        bodyFor(visitor.id, point.id, { horaInicio: '08:00', horaFim: '08:00' }),
      );

      expect(reversed.status).toBe(422);
      expect(reversed.body.error.details).toEqual([
        { field: 'dataFim', message: expect.any(String) },
      ]);
      expect(past.body.error.details).toEqual([{ field: 'dataFim', message: expect.any(String) }]);
      expect(sameTime.body.error.details).toEqual([
        { field: 'horaFim', message: expect.any(String) },
      ]);
      expect(await prisma.authorization.count()).toBe(0);
    });
  });

  describe('GET /authorizations/:id', () => {
    it('200 com o mesmo objeto devolvido na criação', async () => {
      const { admin, visitor, point } = await scenario();
      const created = await post(admin, bodyFor(visitor.id, point.id));

      const res = await get(admin, created.body.id);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(created.body);
    });

    it('calcula situacaoEfetiva e usosRestantes de uma autorização já gravada', async () => {
      const { admin, visitor, point } = await scenario();
      const expired = await insertAuthorization({
        usuarioId: visitor.id,
        accessPointId: point.id,
        criadoPorId: admin.id,
        dataInicio: new Date('2020-01-01'),
        dataFim: new Date('2020-01-31'),
      });
      const spent = await insertAuthorization({
        usuarioId: visitor.id,
        accessPointId: point.id,
        criadoPorId: admin.id,
        dataFim: new Date('2099-01-01'),
        usosPermitidos: 2,
        usosRealizados: 2,
      });
      const cancelled = await insertAuthorization({
        usuarioId: visitor.id,
        accessPointId: point.id,
        criadoPorId: admin.id,
        dataFim: new Date('2099-01-01'),
        situacao: 'CANCELADA',
        canceladoPorId: admin.id,
        canceladoEm: new Date('2026-10-20T13:00:00Z'),
        motivoCancelamento: 'Pedido da moradora',
      });

      const expiredRes = await get(admin, expired.id);
      const spentRes = await get(admin, spent.id);
      const cancelledRes = await get(admin, cancelled.id);

      expect(expiredRes.body).toMatchObject({
        dataFim: '2020-01-31',
        situacao: 'ATIVA',
        situacaoEfetiva: 'EXPIRADA',
      });
      expect(spentRes.body).toMatchObject({ situacaoEfetiva: 'ESGOTADA', usosRestantes: 0 });
      expect(cancelledRes.body).toMatchObject({
        situacaoEfetiva: 'CANCELADA',
        canceladoPor: { id: admin.id, nome: 'Admin' },
        canceladoEm: '2026-10-20T13:00:00.000Z',
        motivoCancelamento: 'Pedido da moradora',
      });
    });

    it('404 para id inexistente e para id malformado', async () => {
      const { admin } = await scenario();

      const missing = await get(admin, newId());
      const malformed = await get(admin, 'nao-e-id');

      expect(missing.status).toBe(404);
      expect(missing.body.error.code).toBe('NOT_FOUND');
      expect(malformed.status).toBe(404);
    });

    it('401 sem token e 403 para quem não é administrador, inclusive o dono (a B09 abre a visão do dono)', async () => {
      const { admin, visitor, point } = await scenario();
      const created = await post(admin, bodyFor(visitor.id, point.id));

      const anonymous = await request(app).get(`/api/v1/authorizations/${created.body.id}`);
      const owner = await get(visitor, created.body.id);

      expect(anonymous.status).toBe(401);
      expect(owner.status).toBe(403);
    });
  });
});
