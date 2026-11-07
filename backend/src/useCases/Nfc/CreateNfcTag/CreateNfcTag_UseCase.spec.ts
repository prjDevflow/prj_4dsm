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

  it('deve gravar descricao nula quando ela não vem', async () => {
    const { sut, tags, user } = await makeSut();

    const created = await sut.execute({ usuarioId: user.id, uid: '04A1B2C3' });

    expect(created.descricao).toBeNull();
    expect(tags.all()[0]?.descricao).toBeNull();
  });

  it('deve rejeitar o UID repetido, mesmo escrito de outro jeito, com 409 TAG_JA_CADASTRADA', async () => {
    const { sut, tags, user } = await makeSut();
    await sut.execute({ usuarioId: user.id, uid: '04A1B2C3' });

    const error = await sut.execute({ usuarioId: user.id, uid: '04:a1:b2:c3' }).catch((e) => e);

    expect(error).toMatchObject({ code: 'TAG_JA_CADASTRADA', status: 409 });
    expect(tags.all()).toHaveLength(1);
  });

  it('deve rejeitar o UID de uma tag de outro usuário com 409 TAG_JA_CADASTRADA', async () => {
    const { sut, users, user } = await makeSut();
    const other = makeUser({
      id: '00000000-0000-4000-8000-0000000000e2',
      email: 'outra@teste.local',
    });
    await users.save(other);
    await sut.execute({ usuarioId: user.id, uid: '04A1B2C3' });

    const error = await sut.execute({ usuarioId: other.id, uid: '04A1B2C3' }).catch((e) => e);

    expect(error).toMatchObject({ code: 'TAG_JA_CADASTRADA', status: 409 });
  });

  it('deve rejeitar usuário inexistente com 404 e não gravar', async () => {
    const { sut, tags } = await makeSut();

    const error = await sut
      .execute({ usuarioId: '00000000-0000-4000-8000-0000000000ff', uid: '04A1B2C3' })
      .catch((e) => e);

    expect(error).toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
      message: 'Usuário não encontrado',
    });
    expect(tags.all()).toEqual([]);
  });

  it('deve rejeitar usuário inativo com 422 no campo usuarioId e não gravar', async () => {
    const { sut, users, tags } = await makeSut();
    const inactive = makeUser({ id: '00000000-0000-4000-8000-0000000000e3', ativo: false });
    await users.save(inactive);

    const error = await sut.execute({ usuarioId: inactive.id, uid: '04A1B2C3' }).catch((e) => e);

    expect(error).toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
      details: [{ field: 'usuarioId', message: 'Usuário inativo' }],
    });
    expect(tags.all()).toEqual([]);
  });

  it('deve rejeitar UID inválido com 422 no campo uid e não gravar', async () => {
    const { sut, tags, user } = await makeSut();

    const error = await sut.execute({ usuarioId: user.id, uid: '04A1B2C' }).catch((e) => e);

    expect(error).toMatchObject({ code: 'VALIDATION_ERROR', status: 422 });
    expect(error.details).toEqual([{ field: 'uid', message: expect.any(String) }]);
    expect(tags.all()).toEqual([]);
  });

  it('deve dar o erro do usuário antes do 409 quando as duas coisas acontecem', async () => {
    const { sut, users, tags, user } = await makeSut();
    await sut.execute({ usuarioId: user.id, uid: '04A1B2C3' });
    await users.save({ ...user, ativo: false });

    const error = await sut.execute({ usuarioId: user.id, uid: '04A1B2C3' }).catch((e) => e);

    expect(error).toMatchObject({ code: 'VALIDATION_ERROR', status: 422 });
    expect(tags.all()).toHaveLength(1);
  });
});
