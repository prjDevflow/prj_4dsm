import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { InMemoryNfcTagRepository } from '../../../../test/doubles/InMemoryNfcTagRepository';
import { InMemoryUserRepository } from '../../../../test/doubles/InMemoryUserRepository';
import { SequentialIdGenerator } from '../../../../test/doubles/SequentialIdGenerator';
import { makeUser } from '../../../../test/factories/makeUser';
import { CreateNfcTagUseCase } from './CreateNfcTag_UseCase';

const makeSut = async () => {
  const users = new InMemoryUserRepository();
  const tags = new InMemoryNfcTagRepository();
  const ids = new SequentialIdGenerator();
  const clock = new FakeClock();
  const user = makeUser();
  await users.save(user);
  const sut = new CreateNfcTagUseCase(users, tags, ids, clock);
  return { sut, users, tags, ids, clock, user };
};

describe('CreateNfcTag', () => {
  it('deve gravar a tag com o UID normalizado, ativa, com o id gerado e a hora do relógio', async () => {
    const { sut, tags, clock, user } = await makeSut();

    const created = await sut.execute({
      usuarioId: user.id,
      uid: '04:a1:b2:c3',
      descricao: 'Cartão azul',
    });

    const expected = {
      id: '00000000-0000-4000-8000-000000000001',
      usuarioId: user.id,
      uid: '04A1B2C3',
      descricao: 'Cartão azul',
      ativa: true,
      criadaEm: clock.now(),
    };
    expect(created).toEqual(expected);
    expect(tags.all()).toEqual([expected]);
  });

  it.todo('deve gravar descricao nula quando ela não vem');
  it.todo('deve rejeitar o UID repetido, mesmo escrito de outro jeito, com 409 TAG_JA_CADASTRADA');
  it.todo('deve rejeitar usuário inexistente com 404 e não gravar');
  it.todo('deve rejeitar usuário inativo com 422 no campo usuarioId e não gravar');
  it.todo('deve rejeitar UID inválido com 422 no campo uid e não gravar');
  it.todo('deve dar o erro do usuário antes do 409 quando as duas coisas acontecem');
});
