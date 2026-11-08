import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import { bearer, insertUser, newId, resetDatabase } from './helpers';

const METHODS = ['post', 'put', 'patch', 'delete'] as const;

describe('eventos de acesso são somente inserção', () => {
  beforeEach(resetDatabase);

  it.each(['patch', 'put', 'delete'] as const)(
    '%s /access-events/:id não existe (404 NOT_FOUND), nem para o administrador',
    async (method) => {
      const admin = await insertUser({ perfil: 'ADMIN' });

      const res = await request(createApp())
        [method](`/api/v1/access-events/${newId()}`)
        .set('Authorization', bearer(admin));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    },
  );

  // The history routes exist (GET), so every other method on the same paths must still be refused.
  it.each(METHODS)(
    '%s em /access-events e em /me/access-events não existe (404 NOT_FOUND), nem para o administrador',
    async (method) => {
      const admin = await insertUser({ perfil: 'ADMIN' });
      const app = createApp();

      for (const path of ['/api/v1/access-events', '/api/v1/me/access-events']) {
        const res = await request(app)[method](path).set('Authorization', bearer(admin)).send({});

        expect(res.status, `${method.toUpperCase()} ${path}`).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
      }
    },
  );

  it.each(METHODS)('%s em /me/access-events/:id não existe (404 NOT_FOUND)', async (method) => {
    const user = await insertUser();

    const res = await request(createApp())
      [method](`/api/v1/me/access-events/${newId()}`)
      .set('Authorization', bearer(user))
      .send({});

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
