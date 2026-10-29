import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaAuthorizationRepository } from '../../src/infra/repositories/PrismaAuthorizationRepository';
import { insertAuthorization, insertUser, prisma, resetDatabase } from './helpers';

const authorizations = new PrismaAuthorizationRepository(prisma);

const stored = (id: string) => prisma.authorization.findUniqueOrThrow({ where: { id } });

describe('PrismaAuthorizationRepository (B09)', () => {
  beforeEach(resetDatabase);

  describe('cancelIfActive', () => {
    it('cancela a autorização ATIVA e grava quem, quando e o motivo', async () => {
      const admin = await insertUser({ perfil: 'ADMIN' });
      const { id } = await insertAuthorization();
      const canceladoEm = new Date('2026-10-20T14:00:00Z');

      const changed = await authorizations.cancelIfActive({
        id,
        canceladoPorId: admin.id,
        canceladoEm,
        motivo: 'Pedido da moradora',
      });

      expect(changed).toBe(true);
      expect(await stored(id)).toMatchObject({
        situacao: 'CANCELADA',
        canceladoPorId: admin.id,
        canceladoEm,
        motivoCancelamento: 'Pedido da moradora',
      });
    });

    it('não altera uma autorização já cancelada e devolve false', async () => {
      const first = await insertUser({ perfil: 'ADMIN' });
      const second = await insertUser({ perfil: 'ADMIN' });
      const { id } = await insertAuthorization();
      const firstAt = new Date('2026-10-20T14:00:00Z');
      await authorizations.cancelIfActive({
        id,
        canceladoPorId: first.id,
        canceladoEm: firstAt,
        motivo: 'Primeiro',
      });

      const changed = await authorizations.cancelIfActive({
        id,
        canceladoPorId: second.id,
        canceladoEm: new Date('2026-10-21T14:00:00Z'),
        motivo: 'Segundo',
      });

      expect(changed).toBe(false);
      expect(await stored(id)).toMatchObject({
        canceladoPorId: first.id,
        canceladoEm: firstAt,
        motivoCancelamento: 'Primeiro',
      });
    });

    it('devolve false quando a autorização não existe', async () => {
      const admin = await insertUser({ perfil: 'ADMIN' });

      const changed = await authorizations.cancelIfActive({
        id: '00000000-0000-4000-8000-0000000000ff',
        canceladoPorId: admin.id,
        canceladoEm: new Date(),
        motivo: null,
      });

      expect(changed).toBe(false);
    });
  });
});
