import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { FakeHashProvider } from '../../../../test/doubles/FakeHashProvider';
import { InMemoryUserRepository } from '../../../../test/doubles/InMemoryUserRepository';
import { SequentialIdGenerator } from '../../../../test/doubles/SequentialIdGenerator';
import { CreateUserUseCase } from './CreateUser_UseCase';

const makeSut = () => {
  const users = new InMemoryUserRepository();
  const hash = new FakeHashProvider();
  const ids = new SequentialIdGenerator();
  const clock = new FakeClock();
  const sut = new CreateUserUseCase(users, hash, ids, clock);
  return { sut, users, hash, ids, clock };
};

const input = {
  nome: 'Maria Souza',
  email: 'Maria@Teste.local',
  perfil: 'CONDOMINO' as const,
  senha: 'Senha-Valida-123',
};

describe('CreateUser', () => {
  it('deve gravar o e-mail em minúsculas e a senha só como hash', async () => {
    const { sut, users, hash } = makeSut();

    await sut.execute(input);

    const saved = await users.findByEmail('maria@teste.local');
    expect(saved?.senhaHash).toBe(await hash.hash(input.senha));
    expect(saved?.senhaHash).not.toBe(input.senha);
  });

  it('deve ignorar espaços nas pontas do e-mail', async () => {
    const { sut, users } = makeSut();

    await sut.execute({ ...input, email: '  Maria@Teste.local ' });

    expect(await users.findByEmail('maria@teste.local')).not.toBeNull();
  });

  it('deve usar o id do gerador, o relógio injetado e ativo verdadeiro', async () => {
    const { sut, users, clock } = makeSut();
    const expectedId = '00000000-0000-4000-8000-000000000001';

    const created = await sut.execute(input);

    const saved = await users.findById(expectedId);
    expect(created.id).toBe(expectedId);
    expect(saved).toMatchObject({
      ativo: true,
      criadoEm: clock.now(),
      atualizadoEm: clock.now(),
      nome: 'Maria Souza',
      perfil: 'CONDOMINO',
    });
  });

  it('deve rejeitar e-mail repetido, inclusive variando maiúsculas, com 409 EMAIL_JA_CADASTRADO', async () => {
    const { sut } = makeSut();
    await sut.execute(input);

    const error = await sut.execute({ ...input, email: 'MARIA@teste.LOCAL' }).catch((e) => e);

    expect(error).toMatchObject({ code: 'EMAIL_JA_CADASTRADO', status: 409 });
  });

  it('deve devolver o usuário sem o senhaHash', async () => {
    const { sut } = makeSut();

    const created = await sut.execute(input);

    expect(created).not.toHaveProperty('senhaHash');
    expect(created).toEqual({
      id: expect.any(String),
      nome: 'Maria Souza',
      email: 'maria@teste.local',
      perfil: 'CONDOMINO',
      ativo: true,
      criadoEm: expect.any(Date),
    });
  });
});
