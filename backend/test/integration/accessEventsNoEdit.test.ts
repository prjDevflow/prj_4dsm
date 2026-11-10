import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import { bearer, insertUser, newId, prisma, resetDatabase } from './helpers';

const METHODS = ['post', 'put', 'patch', 'delete'] as const;

describe('eventos de acesso são somente inserção', () => {
  beforeEach(resetDatabase);

  // A real event, not a made-up id: a route that deletes but answers 404 for an id it does not know
  // would pass with a missing one. The event has to be refused and still be there, unchanged.
  it.each(['patch', 'put', 'delete'] as const)(
    '%s /access-events/:id não existe (404 NOT_FOUND) e o evento continua igual, nem para o administrador',
    async (method) => {
      const admin = await insertUser({ perfil: 'ADMIN' });
      const stored = await prisma.accessEvent.create({
        data: { metodo: 'QR', resultado: 'AUTORIZADO', usuarioId: admin.id },
      });

      const res = await request(createApp())
        [method](`/api/v1/access-events/${stored.id}`)
        .set('Authorization', bearer(admin))
        .send({ resultado: 'NEGADO', motivo: 'TAG_INATIVA' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(await prisma.accessEvent.findMany()).toEqual([stored]);
    },
  );

  it('um id que não existe também dá 404 NOT_FOUND', async () => {
    const admin = await insertUser({ perfil: 'ADMIN' });

    const res = await request(createApp())
      .delete(`/api/v1/access-events/${newId()}`)
      .set('Authorization', bearer(admin));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  // The history routes exist (GET), so every other method on the same paths must still be refused.
  it.each(METHODS)(
    '%s em /access-events e em /me/access-events não existe (404 NOT_FOUND), nem para o administrador',
    async (method) => {
      const admin = await insertUser({ perfil: 'ADMIN' });
      const stored = await prisma.accessEvent.create({
        data: { metodo: 'NFC', resultado: 'NEGADO', motivo: 'TAG_INATIVA', usuarioId: admin.id },
      });
      const app = createApp();

      for (const path of ['/api/v1/access-events', '/api/v1/me/access-events']) {
        const res = await request(app)[method](path).set('Authorization', bearer(admin)).send({});

        expect(res.status, `${method.toUpperCase()} ${path}`).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
      }
      expect(await prisma.accessEvent.findMany()).toEqual([stored]);
    },
  );

  it.each(METHODS)(
    '%s em /me/access-events/:id não existe (404 NOT_FOUND) e o evento da pessoa continua igual',
    async (method) => {
      const user = await insertUser();
      const stored = await prisma.accessEvent.create({
        data: { metodo: 'QR', resultado: 'AUTORIZADO', usuarioId: user.id },
      });

      const res = await request(createApp())
        [method](`/api/v1/me/access-events/${stored.id}`)
        .set('Authorization', bearer(user))
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(await prisma.accessEvent.findMany()).toEqual([stored]);
    },
  );
});
