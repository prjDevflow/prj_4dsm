import { describe, expect, it } from 'vitest';
import { FakeHashProvider } from '../../../../test/doubles/FakeHashProvider';
import { FakeTokenProvider } from '../../../../test/doubles/FakeTokenProvider';
import { InMemoryUserRepository } from '../../../../test/doubles/InMemoryUserRepository';
import { makeUser } from '../../../../test/factories/makeUser';
import { LoginUserUseCase } from './LoginUser_UseCase';

const SENHA = 'Senha-Valida-123';

const makeSut = () => {
  const users = new InMemoryUserRepository();
  const hash = new FakeHashProvider();
  const tokens = new FakeTokenProvider();
  const sut = new LoginUserUseCase(users, hash, tokens, { expiresInSeconds: 43200 });
  return { sut, users, hash, tokens };
};

describe('LoginUser', () => {
  it('deve devolver token e usuário sem o hash da senha quando as credenciais estão certas', async () => {
    const { sut, users, hash, tokens } = makeSut();
    const user = makeUser({ email: 'a@b.com', senhaHash: await hash.hash(SENHA) });
    await users.save(user);

    const result = await sut.execute({ email: 'a@b.com', senha: SENHA });

    expect(result.tokenType).toBe('Bearer');
    expect(tokens.verify(result.accessToken)).toEqual({ sub: user.id, perfil: user.perfil });
    expect(result.usuario).toEqual({
      id: user.id,
      nome: user.nome,
      email: 'a@b.com',
      perfil: user.perfil,
    });
    expect(result.usuario).not.toHaveProperty('senhaHash');
  });

  it('deve devolver expiresIn em segundos a partir da configuração', async () => {
    const { sut, users, hash } = makeSut();
    await users.save(makeUser({ email: 'a@b.com', senhaHash: await hash.hash(SENHA) }));

    const result = await sut.execute({ email: 'a@b.com', senha: SENHA });

    expect(result.expiresIn).toBe(43200);
  });

  it('deve normalizar o e-mail para minúsculas antes da busca', async () => {
    const { sut, users, hash } = makeSut();
    await users.save(makeUser({ email: 'maria@teste.com', senhaHash: await hash.hash(SENHA) }));

    const result = await sut.execute({ email: 'Maria@Teste.COM', senha: SENHA });

    expect(result.usuario.email).toBe('maria@teste.com');
  });

  it('deve lançar o mesmo code e a mesma mensagem para senha errada e e-mail inexistente', async () => {
    const { sut, users, hash } = makeSut();
    await users.save(makeUser({ email: 'a@b.com', senhaHash: await hash.hash(SENHA) }));

    const wrongPassword = await sut
      .execute({ email: 'a@b.com', senha: 'errada-123' })
      .catch((e) => e);
    const unknownEmail = await sut.execute({ email: 'x@b.com', senha: SENHA }).catch((e) => e);

    expect(wrongPassword.code).toBe('CREDENCIAIS_INVALIDAS');
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.code).toBe(wrongPassword.code);
    expect(unknownEmail.status).toBe(wrongPassword.status);
    expect(unknownEmail.message).toBe(wrongPassword.message);
  });

  it.todo('deve comparar a senha com um hash falso quando o e-mail não existe');
  it.todo('deve lançar USUARIO_INATIVO (403) quando a conta está inativa e a senha está certa');
  it.todo(
    'deve continuar lançando CREDENCIAIS_INVALIDAS (401) quando a conta está inativa e a senha está errada',
  );
});
