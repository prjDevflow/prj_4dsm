import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import {
  bearer,
  insertAccessPoint,
  insertAuthorization,
  insertBuilding,
  insertUser,
  resetDatabase,
} from './helpers';

const app = createApp();

type Actor = Parameters<typeof bearer>[0];

// The integration tests use the system clock, so "past" is 2020 and "future" is 2099.
const PAST = { dataInicio: new Date('2020-01-01'), dataFim: new Date('2020-01-31') };
const FUTURE = { dataInicio: new Date('2099-01-01'), dataFim: new Date('2099-01-31') };

async function scenario() {
  const admin = await insertUser({ nome: 'Admin', perfil: 'ADMIN' });
  const maria = await insertUser({ nome: 'Maria Souza', perfil: 'VISITANTE' });
  const joao = await insertUser({ nome: 'João Alves', perfil: 'CONDOMINO' });
  const building = await insertBuilding({ nome: 'Edifício Central' });
  const gate = await insertAccessPoint({ buildingId: building.id, nome: 'Catraca Social' });
  const door = await insertAccessPoint({ buildingId: building.id, nome: 'Porta do Bloco A' });
  const add = (overrides: Parameters<typeof insertAuthorization>[0] = {}) =>
    insertAuthorization({
      usuarioId: maria.id,
      accessPointId: gate.id,
      criadoPorId: admin.id,
      ...FUTURE,
      ...overrides,
    });
  return { admin, maria, joao, gate, door, add };
}

const list = (actor: Actor, query = '') =>
  request(app).get(`/api/v1/authorizations${query}`).set('Authorization', bearer(actor));

const mine = (actor: Actor, query = '') =>
  request(app).get(`/api/v1/me/authorizations${query}`).set('Authorization', bearer(actor));

const idsOf = (body: { data: Array<{ id: string }> }) => body.data.map((item) => item.id).sort();

describe('GET /authorizations', () => {
  beforeEach(resetDatabase);

  it('200 com a página, o objeto completo e as mais recentes primeiro', async () => {
    const { admin, maria, joao, door, add } = await scenario();
    const older = await add({ criadoEm: new Date('2026-10-01T10:00:00Z') });
    const newer = await add({
      usuarioId: joao.id,
      accessPointId: door.id,
      criadoEm: new Date('2026-10-02T10:00:00Z'),
      usosRealizados: 1,
    });

    const res = await list(admin);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, pageSize: 20, total: 2 });
    expect(res.body.data.map((item: { id: string }) => item.id)).toEqual([newer.id, older.id]);
    expect(res.body.data[0]).toEqual({
      id: newer.id,
      usuario: { id: joao.id, nome: 'João Alves', perfil: 'CONDOMINO' },
      local: {
        id: door.id,
        nome: 'Porta do Bloco A',
        tipo: 'PORTA',
        edificio: { id: door.buildingId, nome: 'Edifício Central' },
      },
      dataInicio: '2099-01-01',
      dataFim: '2099-01-31',
      horaInicio: '08:00',
      horaFim: '18:00',
      usosPermitidos: 3,
      usosRealizados: 1,
      usosRestantes: 2,
      situacao: 'ATIVA',
      situacaoEfetiva: 'ATIVA',
      criadoPor: { id: admin.id, nome: 'Admin' },
      criadoEm: '2026-10-02T10:00:00.000Z',
      canceladoPor: null,
      canceladoEm: null,
      motivoCancelamento: null,
    });
    expect(maria.id).toBeTruthy();
  });

  it('filtra por usuarioId', async () => {
    const { admin, maria, joao, add } = await scenario();
    const hers = await add({ usuarioId: maria.id });
    await add({ usuarioId: joao.id });

    const res = await list(admin, `?usuarioId=${maria.id}`);

    expect(idsOf(res.body)).toEqual([hers.id]);
  });

  it('filtra por accessPointId', async () => {
    const { admin, door, add } = await scenario();
    await add();
    const atDoor = await add({ accessPointId: door.id });

    const res = await list(admin, `?accessPointId=${door.id}`);

    expect(idsOf(res.body)).toEqual([atDoor.id]);
  });

  it('filtra por situação efetiva, com as quatro situações e a precedência', async () => {
    const { admin, add } = await scenario();
    const active = await add();
    const spent = await add({ usosRealizados: 3 });
    const expired = await add({ ...PAST });
    const expiredAndSpent = await add({ ...PAST, usosRealizados: 3 });
    const cancelled = await add({ situacao: 'CANCELADA' });
    const cancelledAndExpired = await add({ ...PAST, situacao: 'CANCELADA' });

    const byStatus = async (situacao: string) =>
      idsOf((await list(admin, `?situacao=${situacao}`)).body);

    expect(await byStatus('ATIVA')).toEqual([active.id]);
    expect(await byStatus('ESGOTADA')).toEqual([spent.id]);
    expect(await byStatus('EXPIRADA')).toEqual([expired.id, expiredAndSpent.id].sort());
    expect(await byStatus('CANCELADA')).toEqual([cancelled.id, cancelledAndExpired.id].sort());
  });

  it('filtra por dataDe e dataAte, com as pontas incluídas', async () => {
    const { admin, add } = await scenario();
    const period = (dataInicio: string, dataFim: string) =>
      add({ dataInicio: new Date(dataInicio), dataFim: new Date(dataFim) });
    const endsOnFrom = await period('2099-03-01', '2099-03-10');
    const endsBefore = await period('2099-03-01', '2099-03-09');
    const startsOnTo = await period('2099-03-20', '2099-03-30');
    const startsAfter = await period('2099-03-21', '2099-03-30');

    const from = await list(admin, '?dataDe=2099-03-10');
    const to = await list(admin, '?dataAte=2099-03-20');
    const both = await list(admin, '?dataDe=2099-03-10&dataAte=2099-03-20');

    expect(idsOf(from.body)).toEqual([endsOnFrom.id, startsOnTo.id, startsAfter.id].sort());
    expect(idsOf(to.body)).toEqual([endsOnFrom.id, endsBefore.id, startsOnTo.id].sort());
    expect(idsOf(both.body)).toEqual([endsOnFrom.id, startsOnTo.id].sort());
  });

  it('combina os filtros', async () => {
    const { admin, maria, joao, gate, door, add } = await scenario();
    const target = await add({ usuarioId: maria.id, accessPointId: gate.id });
    await add({ usuarioId: joao.id, accessPointId: gate.id });
    await add({ usuarioId: maria.id, accessPointId: door.id });
    await add({ usuarioId: maria.id, accessPointId: gate.id, usosRealizados: 3 });
    await add({ usuarioId: maria.id, accessPointId: gate.id, ...PAST });

    const res = await list(
      admin,
      `?usuarioId=${maria.id}&accessPointId=${gate.id}&situacao=ATIVA&dataDe=2099-01-15`,
    );

    expect(idsOf(res.body)).toEqual([target.id]);
    expect(res.body.total).toBe(1);
  });

  it('pagina e informa o total', async () => {
    const { admin, add } = await scenario();
    for (let i = 0; i < 5; i++) await add({ criadoEm: new Date(`2026-10-0${i + 1}T10:00:00Z`) });

    const res = await list(admin, '?page=3&pageSize=2');

    expect(res.body).toMatchObject({ page: 3, pageSize: 2, total: 5 });
    expect(res.body.data).toHaveLength(1);
  });

  it('lista vazia quando nada casa', async () => {
    const { admin } = await scenario();

    const res = await list(admin);

    expect(res.body).toEqual({ data: [], page: 1, pageSize: 20, total: 0 });
  });

  it.each([
    ['situacao=VENCIDA', 'situacao'],
    ['situacao=ativa', 'situacao'],
    ['dataDe=2099-02-30', 'dataDe'],
    ['dataAte=20/01/2099', 'dataAte'],
    ['usuarioId=nao-e-id', 'usuarioId'],
    ['accessPointId=nao-e-id', 'accessPointId'],
    ['pageSize=101', 'pageSize'],
    ['page=0', 'page'],
    ['dataDe=2099-03-10&dataAte=2099-03-09', 'dataAte'],
  ])('422 com %s e a mensagem no campo %s', async (query, field) => {
    const { admin } = await scenario();

    const res = await list(admin, `?${query}`);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([{ field, message: expect.any(String) }]);
  });

  it('aceita dataDe igual a dataAte', async () => {
    const { admin } = await scenario();

    const res = await list(admin, '?dataDe=2099-03-10&dataAte=2099-03-10');

    expect(res.status).toBe(200);
  });

  it('401 sem token, e 403 para condômino e visitante', async () => {
    const { maria, joao } = await scenario();

    const anonymous = await request(app).get('/api/v1/authorizations');
    const asVisitor = await list(maria);
    const asResident = await list(joao);

    expect(anonymous.status).toBe(401);
    expect(asVisitor.status).toBe(403);
    expect(asVisitor.body.error.code).toBe('FORBIDDEN');
    expect(asResident.status).toBe(403);
  });
});

describe('GET /me/authorizations', () => {
  beforeEach(resetDatabase);

  it('devolve só as próprias, para qualquer perfil', async () => {
    const { admin, maria, joao, add } = await scenario();
    const hers = await add({ usuarioId: maria.id });
    const his = await add({ usuarioId: joao.id });
    const theAdmins = await add({ usuarioId: admin.id });

    const asVisitor = await mine(maria);
    const asResident = await mine(joao);
    const asAdmin = await mine(admin);

    expect(idsOf(asVisitor.body)).toEqual([hers.id]);
    expect(idsOf(asResident.body)).toEqual([his.id]);
    expect(idsOf(asAdmin.body)).toEqual([theAdmins.id]);
    expect(asVisitor.body).toMatchObject({ page: 1, pageSize: 20, total: 1 });
    expect(asVisitor.body.data[0]).toMatchObject({
      usuario: { id: maria.id },
      local: { nome: 'Catraca Social' },
      usosRestantes: 3,
      situacaoEfetiva: 'ATIVA',
    });
  });

  it('teste de vazamento: um usuarioId na query não traz a autorização de outra pessoa', async () => {
    const { maria, joao, add } = await scenario();
    await add({ usuarioId: joao.id });
    const hers = await add({ usuarioId: maria.id });

    const res = await mine(maria, `?usuarioId=${joao.id}`);

    expect(res.status).toBe(200);
    expect(idsOf(res.body)).toEqual([hers.id]);
    expect(res.body.total).toBe(1);
  });

  it('filtra pela situação efetiva', async () => {
    const { maria, joao, add } = await scenario();
    const active = await add();
    const expired = await add({ ...PAST });
    await add({ usuarioId: joao.id, ...PAST });

    expect(idsOf((await mine(maria, '?situacao=EXPIRADA')).body)).toEqual([expired.id]);
    expect(idsOf((await mine(maria, '?situacao=ATIVA')).body)).toEqual([active.id]);
  });

  it('ordena por dataFim crescente e pagina', async () => {
    const { maria, add } = await scenario();
    const late = await add({ dataFim: new Date('2099-12-01') });
    const early = await add({ dataFim: new Date('2099-02-01') });
    const middle = await add({ dataFim: new Date('2099-06-01') });

    const all = await mine(maria);
    const second = await mine(maria, '?page=2&pageSize=2');

    expect(all.body.data.map((item: { id: string }) => item.id)).toEqual([
      early.id,
      middle.id,
      late.id,
    ]);
    expect(second.body).toMatchObject({ page: 2, pageSize: 2, total: 3 });
    expect(second.body.data.map((item: { id: string }) => item.id)).toEqual([late.id]);
  });

  it('422 com situacao inválida, e 401 sem token', async () => {
    const { maria } = await scenario();

    const invalid = await mine(maria, '?situacao=VENCIDA');
    const anonymous = await request(app).get('/api/v1/me/authorizations');

    expect(invalid.status).toBe(422);
    expect(invalid.body.error.details).toEqual([
      { field: 'situacao', message: expect.any(String) },
    ]);
    expect(anonymous.status).toBe(401);
  });
});
