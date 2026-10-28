import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import {
  bearer,
  insertAccessPoint,
  insertBuilding,
  insertUser,
  prisma,
  resetDatabase,
} from './helpers';

const app = createApp();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Starts a transaction that inserts an authorization for `accessPointId` and keeps it open (so it holds
 * the row lock that the foreign key takes on the access point) until `commit()` is called.
 */
async function startAuthorizationInsert(accessPointId: string) {
  const user = await insertUser();
  const admin = await insertUser({ perfil: 'ADMIN' });
  let commit!: () => void;
  const gate = new Promise<void>((resolve) => (commit = resolve));
  let inserted!: () => void;
  const insertedSignal = new Promise<void>((resolve) => (inserted = resolve));

  const transaction = prisma.$transaction(async (tx) => {
    await tx.authorization.create({
      data: {
        usuarioId: user.id,
        criadoPorId: admin.id,
        accessPointId,
        dataInicio: new Date('2026-10-01'),
        dataFim: new Date('2099-01-01'),
        horaInicio: '08:00',
        horaFim: '18:00',
        usosPermitidos: 3,
      },
    });
    inserted();
    await gate;
  });
  await insertedSignal;
  return { commit, transaction };
}

const isPending = async (promise: Promise<unknown>) => {
  let settled = false;
  void promise.then(
    () => (settled = true),
    () => (settled = true),
  );
  await sleep(300);
  return !settled;
};

describe('desativar locais contra requisições simultâneas', () => {
  beforeEach(resetDatabase);

  it('desativar o ponto espera uma autorização em criação e, depois dela, recusa com 409', async () => {
    const admin = await insertUser({ perfil: 'ADMIN' });
    const point = await insertAccessPoint();
    const open = await startAuthorizationInsert(point.id);

    const patch = request(app)
      .patch(`/api/v1/access-points/${point.id}`)
      .set('Authorization', bearer(admin))
      .send({ ativo: false })
      .then((res) => res);

    expect(await isPending(patch)).toBe(true);
    open.commit();
    await open.transaction;
    const res = await patch;

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LOCAL_COM_AUTORIZACOES_ATIVAS');
    expect((await prisma.accessPoint.findUniqueOrThrow({ where: { id: point.id } })).ativo).toBe(
      true,
    );
  });

  it('desativar o edifício espera uma autorização em criação num ponto dele e, depois dela, recusa com 409', async () => {
    const admin = await insertUser({ perfil: 'ADMIN' });
    const building = await insertBuilding();
    const point = await insertAccessPoint({ buildingId: building.id });
    const open = await startAuthorizationInsert(point.id);

    const patch = request(app)
      .patch(`/api/v1/buildings/${building.id}`)
      .set('Authorization', bearer(admin))
      .send({ ativo: false })
      .then((res) => res);

    expect(await isPending(patch)).toBe(true);
    open.commit();
    await open.transaction;
    const res = await patch;

    expect(res.status).toBe(409);
    expect((await prisma.building.findUniqueOrThrow({ where: { id: building.id } })).ativo).toBe(
      true,
    );
    expect((await prisma.accessPoint.findUniqueOrThrow({ where: { id: point.id } })).ativo).toBe(
      true,
    );
  });

  it('criar ponto no instante em que o edifício é desativado nunca deixa um ponto ativo num edifício inativo', async () => {
    const admin = await insertUser({ perfil: 'ADMIN' });

    for (let round = 0; round < 8; round += 1) {
      const building = await insertBuilding({ nome: `Edifício ${round}` });
      const [created, deactivated] = await Promise.all([
        request(app).post('/api/v1/access-points').set('Authorization', bearer(admin)).send({
          buildingId: building.id,
          tipo: 'CATRACA',
          nome: 'Nova',
          identificacao: 'CAT-NOVA',
          latitude: 0,
          longitude: 0,
        }),
        request(app)
          .patch(`/api/v1/buildings/${building.id}`)
          .set('Authorization', bearer(admin))
          .send({ ativo: false }),
      ]);

      expect([201, 422]).toContain(created.status);
      expect(deactivated.status).toBe(200);
      const active = await prisma.accessPoint.count({
        where: { buildingId: building.id, ativo: true },
      });
      expect(active, `rodada ${round}: ponto ativo em edifício inativo`).toBe(0);
    }
  });

  it('reativar um ponto no instante em que o edifício é desativado nunca deixa um ponto ativo num edifício inativo', async () => {
    const admin = await insertUser({ perfil: 'ADMIN' });

    for (let round = 0; round < 8; round += 1) {
      const building = await insertBuilding({ nome: `Edifício ${round}` });
      const point = await insertAccessPoint({ buildingId: building.id, ativo: false });
      const [reactivated, deactivated] = await Promise.all([
        request(app)
          .patch(`/api/v1/access-points/${point.id}`)
          .set('Authorization', bearer(admin))
          .send({ ativo: true }),
        request(app)
          .patch(`/api/v1/buildings/${building.id}`)
          .set('Authorization', bearer(admin))
          .send({ ativo: false }),
      ]);

      expect([200, 422]).toContain(reactivated.status);
      expect(deactivated.status).toBe(200);
      const active = await prisma.accessPoint.count({
        where: { buildingId: building.id, ativo: true },
      });
      expect(active, `rodada ${round}: ponto ativo em edifício inativo`).toBe(0);
    }
  });

  it('dois PATCH simultâneos no mesmo ponto não se sobrescrevem (cada um enxerga o resultado do outro)', async () => {
    const admin = await insertUser({ perfil: 'ADMIN' });
    const point = await insertAccessPoint();
    const patch = (body: object) =>
      request(app)
        .patch(`/api/v1/access-points/${point.id}`)
        .set('Authorization', bearer(admin))
        .send(body);

    const results = await Promise.all([patch({ nome: 'Novo Nome' }), patch({ tipo: 'PORTA' })]);

    expect(results.map((r) => r.status)).toEqual([200, 200]);
    const saved = await prisma.accessPoint.findUniqueOrThrow({ where: { id: point.id } });
    expect(saved).toMatchObject({ nome: 'Novo Nome', tipo: 'PORTA' });
  });
});
