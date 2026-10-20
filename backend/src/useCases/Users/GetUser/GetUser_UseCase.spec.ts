import { describe, expect, it } from 'vitest';
import { InMemoryUserRepository } from '../../../../test/doubles/InMemoryUserRepository';
import { makeUser } from '../../../../test/factories/makeUser';
import { GetUserUseCase } from './GetUser_UseCase';

const makeSut = () => {
  const users = new InMemoryUserRepository();
  const sut = new GetUserUseCase(users);
  return { sut, users };
};

describe('GetUser', () => {
  it('deve devolver o usuário sem o senhaHash', async () => {
    const { sut, users } = makeSut();
    const user = makeUser({ perfil: 'CONDOMINO', ativo: false });
    await users.save(user);

    const result = await sut.execute(user.id);

    expect(result).toEqual({
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: 'CONDOMINO',
      ativo: false,
      criadoEm: user.criadoEm,
    });
    expect(result).not.toHaveProperty('senhaHash');
  });

  it('deve lançar NotFoundError quando o usuário não existe', async () => {
    const { sut } = makeSut();

    const error = await sut.execute('00000000-0000-4000-8000-0000000000ff').catch((e) => e);

    expect(error).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });
});
