import { describe, expect, it } from 'vitest';
import { FakeClock } from '../../../../test/doubles/FakeClock';
import { InMemoryNfcTagRepository } from '../../../../test/doubles/InMemoryNfcTagRepository';
import { InMemoryUserRepository } from '../../../../test/doubles/InMemoryUserRepository';
import { SequentialIdGenerator } from '../../../../test/doubles/SequentialIdGenerator';
import { makeNfcTag } from '../../../../test/factories/makeNfcTag';
import { makeUser } from '../../../../test/factories/makeUser';
import { CreateNfcTagUseCase } from './CreateNfcTag_UseCase';

const USER_ID = '00000000-0000-4000-8000-0000000000e1';
const UNKNOWN_ID = '00000000-0000-4000-8000-0000000000ee';

const makeSut = async () => {
  const users = new InMemoryUserRepository();
  await users.save(makeUser({ id: USER_ID, nome: 'Maria Souza' }));
  const tags = new InMemoryNfcTagRepository(users);
  const clock = new FakeClock(new Date('2026-11-06T12:00:00Z'));
  const sut = new CreateNfcTagUseCase(tags, users, new SequentialIdGenerator(), clock);
  return { sut, tags, users, clock };
};

const allTags = (tags: InMemoryNfcTagRepository) => tags.list({ page: 1, pageSize: 20 });

describe('CreateNfcTag', () => {
  it('deve gravar o UID normalizado, ativa true e criadaEm do relógio injetado', async () => {
    const { sut, tags, clock } = await makeSut();

    const created = await sut.execute({ usuarioId: USER_ID, uid: '04:a1:b2:c3' });

    expect(await tags.findByUid('04A1B2C3')).toEqual({
      id: created.id,
      usuarioId: USER_ID,
      uid: '04A1B2C3',
      descricao: null,
      ativa: true,
      criadaEm: clock.now(),
    });
  });

  it('deve gravar descricao null quando não informada', async () => {
    const { sut, tags } = await makeSut();

    await sut.execute({ usuarioId: USER_ID, uid: '04A1B2C3' });

    expect((await tags.findByUid('04A1B2C3'))?.descricao).toBeNull();
  });

  it('deve devolver a tag com o id e o nome do usuário', async () => {
    const { sut, clock } = await makeSut();

    const created = await sut.execute({
      usuarioId: USER_ID,
      uid: '04A1B2C3',
      descricao: 'Chaveiro azul',
    });

    expect(created).toEqual({
      id: expect.any(String),
      usuario: { id: USER_ID, nome: 'Maria Souza' },
      uid: '04A1B2C3',
      descricao: 'Chaveiro azul',
      ativa: true,
      criadaEm: clock.now(),
    });
  });

  it('deve lançar 422 no campo uid quando o UID é inválido, sem gravar', async () => {
    const { sut, tags } = await makeSut();

    await expect(sut.execute({ usuarioId: USER_ID, uid: '04A1B2G3' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
      details: [{ field: 'uid' }],
    });
    expect((await allTags(tags)).total).toBe(0);
  });

  it('deve lançar 409 TAG_JA_CADASTRADA quando o UID já existe', async () => {
    const { sut, tags } = await makeSut();
    await tags.save(makeNfcTag({ uid: '04A1B2C3' }));

    await expect(sut.execute({ usuarioId: USER_ID, uid: '04A1B2C3' })).rejects.toMatchObject({
      code: 'TAG_JA_CADASTRADA',
      status: 409,
    });
    expect((await allTags(tags)).total).toBe(1);
  });

  it('deve lançar 409 quando o mesmo UID vem escrito de outro jeito', async () => {
    const { sut, tags } = await makeSut();
    await tags.save(makeNfcTag({ uid: '04A1B2C3' }));

    await expect(sut.execute({ usuarioId: USER_ID, uid: '04-a1-b2-c3' })).rejects.toMatchObject({
      code: 'TAG_JA_CADASTRADA',
    });
  });

  it('deve lançar 409 quando a tag existente está desativada', async () => {
    const { sut, tags } = await makeSut();
    await tags.save(makeNfcTag({ uid: '04A1B2C3', ativa: false }));

    await expect(sut.execute({ usuarioId: USER_ID, uid: '04A1B2C3' })).rejects.toMatchObject({
      code: 'TAG_JA_CADASTRADA',
    });
  });

  it('deve lançar 404 quando o usuário não existe', async () => {
    const { sut } = await makeSut();

    await expect(sut.execute({ usuarioId: UNKNOWN_ID, uid: '04A1B2C3' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('deve lançar 422 no campo usuarioId quando o usuário está inativo', async () => {
    const { sut, users, tags } = await makeSut();
    const inactiveId = '00000000-0000-4000-8000-0000000000e2';
    await users.save(makeUser({ id: inactiveId, ativo: false }));

    await expect(sut.execute({ usuarioId: inactiveId, uid: '04A1B2C3' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 422,
      details: [{ field: 'usuarioId' }],
    });
    expect((await allTags(tags)).total).toBe(0);
  });

  it('deve checar o usuário antes da duplicidade', async () => {
    const { sut, tags } = await makeSut();
    await tags.save(makeNfcTag({ uid: '04A1B2C3' }));

    await expect(sut.execute({ usuarioId: UNKNOWN_ID, uid: '04A1B2C3' })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('deve checar o UID antes do usuário', async () => {
    const { sut } = await makeSut();

    await expect(sut.execute({ usuarioId: UNKNOWN_ID, uid: '04A1B2G3' })).rejects.toMatchObject({
      status: 422,
      details: [{ field: 'uid' }],
    });
  });

  it('deve checar se o usuário está inativo antes da duplicidade', async () => {
    const { sut, users, tags } = await makeSut();
    const inactiveId = '00000000-0000-4000-8000-0000000000e2';
    await users.save(makeUser({ id: inactiveId, ativo: false }));
    await tags.save(makeNfcTag({ uid: '04A1B2C3' }));

    await expect(sut.execute({ usuarioId: inactiveId, uid: '04A1B2C3' })).rejects.toMatchObject({
      status: 422,
      details: [{ field: 'usuarioId' }],
    });
  });
});
