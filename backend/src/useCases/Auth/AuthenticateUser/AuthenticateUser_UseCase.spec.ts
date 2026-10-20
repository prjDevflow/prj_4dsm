import { describe, expect, it } from 'vitest';
import { FakeTokenProvider } from '../../../../test/doubles/FakeTokenProvider';
import { InMemoryUserRepository } from '../../../../test/doubles/InMemoryUserRepository';
import { makeUser } from '../../../../test/factories/makeUser';
import { AuthenticateUserUseCase } from './AuthenticateUser_UseCase';

const makeSut = () => {
  const users = new InMemoryUserRepository();
  const tokens = new FakeTokenProvider();
  const sut = new AuthenticateUserUseCase(users, tokens);
  return { sut, users, tokens };
};

describe('AuthenticateUser', () => {
  it('deve devolver o usuário recarregado do repositório quando o token é válido', async () => {
    const { sut, users, tokens } = makeSut();
    const user = makeUser({ perfil: 'ADMIN' });
    await users.save(user);
    const token = tokens.sign({ sub: user.id, perfil: 'ADMIN' });

    const result = await sut.execute({ token });

    expect(result).toEqual({ userId: user.id, perfil: 'ADMIN' });
  });

  it('deve usar o perfil atual do banco, e não o do token', async () => {
    const { sut, users, tokens } = makeSut();
    const user = makeUser({ perfil: 'VISITANTE' });
    await users.save(user);
    const token = tokens.sign({ sub: user.id, perfil: 'ADMIN' });

    const result = await sut.execute({ token });

    expect(result.perfil).toBe('VISITANTE');
  });

  it('deve lançar UNAUTHORIZED (401) quando não há token', async () => {
    const { sut } = makeSut();

    const error = await sut.execute({ token: undefined }).catch((e) => e);

    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.status).toBe(401);
  });

  it('deve lançar UNAUTHORIZED (401) quando o token está expirado', async () => {
    const { sut, users, tokens } = makeSut();
    const user = makeUser();
    await users.save(user);
    const token = tokens.sign({ sub: user.id, perfil: user.perfil });
    tokens.expire(token);

    const error = await sut.execute({ token }).catch((e) => e);

    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.status).toBe(401);
  });

  it('deve lançar UNAUTHORIZED (401) quando o token foi adulterado', async () => {
    const { sut, users, tokens } = makeSut();
    const user = makeUser();
    await users.save(user);
    const token = tokens.sign({ sub: user.id, perfil: user.perfil });

    const error = await sut.execute({ token: `${token}x` }).catch((e) => e);

    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.status).toBe(401);
  });

  it('deve lançar UNAUTHORIZED (401) quando o token é malformado', async () => {
    const { sut } = makeSut();

    const error = await sut.execute({ token: 'isto-nao-e-um-token' }).catch((e) => e);

    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.status).toBe(401);
  });

  it('deve lançar UNAUTHORIZED (401) quando o usuário do token não existe mais', async () => {
    const { sut, tokens } = makeSut();
    const token = tokens.sign({ sub: makeUser().id, perfil: 'VISITANTE' });

    const error = await sut.execute({ token }).catch((e) => e);

    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.status).toBe(401);
  });

  it('deve recusar o usuário desativado depois da emissão do token', async () => {
    const { sut, users, tokens } = makeSut();
    const user = makeUser({ ativo: true });
    await users.save(user);
    const token = tokens.sign({ sub: user.id, perfil: user.perfil });
    await users.save({ ...user, ativo: false });

    const error = await sut.execute({ token }).catch((e) => e);

    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.status).toBe(401);
  });

  it('deve deixar passar o usuário inativo quando allowInactive é verdadeiro', async () => {
    const { sut, users, tokens } = makeSut();
    const user = makeUser({ ativo: false });
    await users.save(user);
    const token = tokens.sign({ sub: user.id, perfil: user.perfil });

    const result = await sut.execute({ token, allowInactive: true });

    expect(result).toEqual({ userId: user.id, perfil: user.perfil });
  });
});
