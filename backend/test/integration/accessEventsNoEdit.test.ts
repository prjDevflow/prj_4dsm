import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/main/app';
import { bearer, insertUser, newId, resetDatabase } from './helpers';

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
});
