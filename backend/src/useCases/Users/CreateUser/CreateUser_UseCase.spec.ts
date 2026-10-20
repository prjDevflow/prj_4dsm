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

  it.todo('deve usar o id do gerador, o relógio injetado e ativo verdadeiro');
  it.todo('deve rejeitar e-mail repetido, inclusive variando maiúsculas, com 409 EMAIL_JA_CADASTRADO');
  it.todo('deve devolver o usuário sem o senhaHash');
});
