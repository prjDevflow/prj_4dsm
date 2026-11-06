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

const isPending = async (promise: Promise<unknown>) => {
  let settled = false;
  void promise.then(
    () => (settled = true),
    () => (settled = true),
  );
  await sleep(300);
  return !settled;
};

/**
 * Starts a transaction that runs `change` and keeps it open (the change is not visible to anyone else
 * and its row lock is held) until `commit()` is called. This is what a deactivation looks like to a
 * request that arrives while it is still running.
 */
async function startUncommitted(change: (tx: typeof prisma) => Promise<unknown>) {
  let commit!: () => void;
  const gate = new Promise<void>((resolve) => (commit = resolve));
  let changed!: () => void;
  const changedSignal = new Promise<void>((resolve) => (changed = resolve));
  const transaction = prisma.$transaction(async (tx) => {
    await change(tx as typeof prisma);
    changed();
    await gate;
  });
  await changedSignal;
  return { commit, transaction };
}

const bodyFor = (usuarioId: string, accessPointId: string) => ({
  usuarioId,
  accessPointId,
  dataInicio: '2099-01-01',
  dataFim: '2099-01-05',
  horaInicio: '08:00',
  horaFim: '18:00',
  usosPermitidos: 3,
});

describe('criar autorização contra desativações simultâneas', () => {
  beforeEach(resetDatabase);

  it('espera a desativação do ponto que ainda não terminou e, depois dela, recusa com 422 em accessPointId', async () => {
    const admin = await insertUser({ perfil: 'ADMIN' });
    const visitor = await insertUser();
    const point = await insertAccessPoint();
    const open = await startUncommitted((tx) =>
      tx.accessPoint.update({ where: { id: point.id }, data: { ativo: false } }),
    );

    const created = request(app)
      .post('/api/v1/authorizations')
      .set('Authorization', bearer(admin))
      .send(bodyFor(visitor.id, point.id))
      .then((res) => res);

    expect(await isPending(created)).toBe(true);
    open.commit();
    await open.transaction;
    const res = await created;

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([
      { field: 'accessPointId', message: 'Ponto de acesso inativo' },
    ]);
    expect(await prisma.authorization.count()).toBe(0);
  });

  it('espera a desativação do usuário que ainda não terminou e, depois dela, recusa com 422 em usuarioId', async () => {
    const admin = await insertUser({ perfil: 'ADMIN' });
    const visitor = await insertUser();
    const point = await insertAccessPoint();
    const open = await startUncommitted((tx) =>
      tx.user.update({ where: { id: visitor.id }, data: { ativo: false } }),
    );

    const created = request(app)
      .post('/api/v1/authorizations')
      .set('Authorization', bearer(admin))
      .send(bodyFor(visitor.id, point.id))
      .then((res) => res);

    expect(await isPending(created)).toBe(true);
    open.commit();
    await open.transaction;
    const res = await created;

    expect(res.status).toBe(422);
    expect(res.body.error.details).toEqual([{ field: 'usuarioId', message: 'Usuário inativo' }]);
    expect(await prisma.authorization.count()).toBe(0);
  });

  it('desativar o usuário espera uma criação em andamento e depois conclui, sem perder a autorização', async () => {
    const admin = await insertUser({ perfil: 'ADMIN' });
    const visitor = await insertUser();
    // The same lock the use case takes on the user, held until the "creation" ends.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    let locked!: () => void;
    const lockedSignal = new Promise<void>((resolve) => (locked = resolve));
    const creating = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${visitor.id}::uuid FOR SHARE`;
      locked();
      await gate;
    });
    await lockedSignal;

    const deactivated = request(app)
      .patch(`/api/v1/users/${visitor.id}`)
      .set('Authorization', bearer(admin))
      .send({ ativo: false })
      .then((res) => res);

    expect(await isPending(deactivated)).toBe(true);
    release();
    await creating;
    expect((await deactivated).status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: visitor.id } })).ativo).toBe(false);
  });

  it('criar autorização no instante em que o ponto é desativado nunca deixa autorização vigente em ponto inativo', async () => {
    const admin = await insertUser({ perfil: 'ADMIN' });
    const visitor = await insertUser();

    for (let round = 0; round < 12; round += 1) {
      const building = await insertBuilding({ nome: `Edifício ${round}` });
      const point = await insertAccessPoint({ buildingId: building.id });
      const send = {
        create: () =>
          request(app)
            .post('/api/v1/authorizations')
            .set('Authorization', bearer(admin))
            .send(bodyFor(visitor.id, point.id)),
        deactivate: () =>
          request(app)
            .patch(`/api/v1/access-points/${point.id}`)
            .set('Authorization', bearer(admin))
            .send({ ativo: false }),
      };
      // Alternate who starts first, so both orders are exercised.
      const [created, deactivated] =
        round % 2 === 0
          ? await Promise.all([send.create(), send.deactivate()])
          : await Promise.all([send.deactivate(), send.create()]).then(([d, c]) => [c, d] as const);

      // Either the authorization won (and the deactivation was refused) or the deactivation won.
      const outcome = `${created.status}/${deactivated.status}`;
      expect(['201/409', '422/200'], `rodada ${round}: ${outcome}`).toContain(outcome);
      const stored = await prisma.authorization.count({ where: { accessPointId: point.id } });
      const pointNow = await prisma.accessPoint.findUniqueOrThrow({ where: { id: point.id } });
      expect(stored > 0 && !pointNow.ativo, `rodada ${round}: autorização em ponto inativo`).toBe(
        false,
      );
    }
  });

  it('criar autorização no instante em que o edifício é desativado nunca deixa autorização vigente em ponto inativo', async () => {
    const admin = await insertUser({ perfil: 'ADMIN' });
    const visitor = await insertUser();

    for (let round = 0; round < 12; round += 1) {
      const building = await insertBuilding({ nome: `Edifício ${round}` });
      const point = await insertAccessPoint({ buildingId: building.id });
      const send = {
        create: () =>
          request(app)
            .post('/api/v1/authorizations')
            .set('Authorization', bearer(admin))
            .send(bodyFor(visitor.id, point.id)),
        deactivate: () =>
          request(app)
            .patch(`/api/v1/buildings/${building.id}`)
            .set('Authorization', bearer(admin))
            .send({ ativo: false }),
      };
      const [created, deactivated] =
        round % 2 === 0
          ? await Promise.all([send.create(), send.deactivate()])
          : await Promise.all([send.deactivate(), send.create()]).then(([d, c]) => [c, d] as const);

      // The deactivation of the building also deactivates its points, so it follows the point's rule.
      const outcome = `${created.status}/${deactivated.status}`;
      expect(['201/409', '422/200'], `rodada ${round}: ${outcome}`).toContain(outcome);
      const stored = await prisma.authorization.count({ where: { accessPointId: point.id } });
      const pointNow = await prisma.accessPoint.findUniqueOrThrow({ where: { id: point.id } });
      expect(stored > 0 && !pointNow.ativo, `rodada ${round}: autorização em ponto inativo`).toBe(
        false,
      );
    }
  });
});
