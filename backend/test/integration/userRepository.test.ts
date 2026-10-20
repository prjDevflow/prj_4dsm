import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaUserRepository } from '../../src/infra/repositories/PrismaUserRepository';
import { insertUser, newId, prisma, resetDatabase } from './helpers';

describe('PrismaUserRepository', () => {
  const repository = new PrismaUserRepository(prisma);
  beforeEach(resetDatabase);

  it('findByEmail devolve a entidade User com todos os campos', async () => {
    const row = await insertUser({ nome: 'Maria', email: 'maria@teste.local', perfil: 'ADMIN' });

    const user = await repository.findByEmail('maria@teste.local');

    expect(user).toEqual({
      id: row.id,
      nome: 'Maria',
      email: 'maria@teste.local',
      senhaHash: row.senhaHash,
      perfil: 'ADMIN',
      ativo: true,
      criadoEm: row.criadoEm,
      atualizadoEm: row.atualizadoEm,
    });
  });

  it('findByEmail devolve null quando o e-mail não existe', async () => {
    expect(await repository.findByEmail('ninguem@teste.local')).toBeNull();
  });

  it('findById devolve o usuário, inclusive o inativo', async () => {
    const row = await insertUser({ ativo: false });

    const user = await repository.findById(row.id);

    expect(user?.id).toBe(row.id);
    expect(user?.ativo).toBe(false);
  });

  it('findById devolve null quando o id não existe', async () => {
    expect(await repository.findById(newId())).toBeNull();
  });
});
