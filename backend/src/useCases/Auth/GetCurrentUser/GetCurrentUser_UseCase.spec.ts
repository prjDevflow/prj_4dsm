import { describe, expect, it } from 'vitest';
import { InMemoryUserRepository } from '../../../../test/doubles/InMemoryUserRepository';
import { makeUser } from '../../../../test/factories/makeUser';
import { GetCurrentUserUseCase } from './GetCurrentUser_UseCase';

const makeSut = () => {
  const users = new InMemoryUserRepository();
  const sut = new GetCurrentUserUseCase(users);
  return { sut, users };
};

describe('GetCurrentUser', () => {
  it('deve devolver id, nome, e-mail e perfil, sem o hash da senha', async () => {
    const { sut, users } = makeSut();
    const user = makeUser({ nome: 'Maria', email: 'maria@teste.com', perfil: 'CONDOMINO' });
    await users.save(user);

    const result = await sut.execute(user.id);

    expect(result).toEqual({
      id: user.id,
      nome: 'Maria',
      email: 'maria@teste.com',
      perfil: 'CONDOMINO',
    });
  });

  it('deve lançar UNAUTHORIZED (401) quando o usuário não existe mais', async () => {
    const { sut } = makeSut();

    const error = await sut.execute(makeUser().id).catch((e) => e);

    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.status).toBe(401);
  });
});
