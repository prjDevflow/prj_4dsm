import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_USERS, createInitialUsers, generatePassword } from '../../scripts/initialUsers';
import { createApp } from '../../src/main/app';
import { container } from '../../src/main/container';
import { CreateUserUseCase } from '../../src/useCases/Users/CreateUser/CreateUser_UseCase';
import { prisma, resetDatabase } from './helpers';

const createUser = new CreateUserUseCase(
  container.users,
  container.hash,
  container.ids,
  container.clock,
);
const run = () =>
  createInitialUsers({
    users: INITIAL_USERS,
    create: (input) => createUser.execute(input),
    generatePassword,
  });

beforeEach(resetDatabase);

describe('usuários iniciais da homologação', () => {
  it('cria dois usuários de cada perfil, e cada um entra com a senha gerada', async () => {
    const results = await run();

    const rows = await prisma.user.groupBy({ by: ['perfil'], _count: true });
    expect(Object.fromEntries(rows.map((r) => [r.perfil, r._count]))).toEqual({
      ADMIN: 2,
      CONDOMINO: 2,
      VISITANTE: 2,
    });

    const app = createApp();
    for (const result of results) {
      if (result.situacao !== 'CRIADO') throw new Error('esperava um usuário criado');
      const login = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: result.email, senha: result.senha });
      expect(login.status).toBe(200);
      expect(login.body.usuario.perfil).toBe(result.perfil);
    }
  });

  it('rodar de novo não cria nada nem troca as senhas', async () => {
    await run();
    const before = await prisma.user.findMany({ orderBy: { email: 'asc' } });

    const again = await run();

    expect(again.every((r) => r.situacao === 'JA_EXISTIA')).toBe(true);
    expect(await prisma.user.findMany({ orderBy: { email: 'asc' } })).toEqual(before);
  });
});
