import { describe, expect, it } from 'vitest';
import { InMemoryNfcTagRepository } from '../../../../test/doubles/InMemoryNfcTagRepository';
import { InMemoryUserRepository } from '../../../../test/doubles/InMemoryUserRepository';
import { makeNfcTag } from '../../../../test/factories/makeNfcTag';
import { makeUser } from '../../../../test/factories/makeUser';
import { UpdateNfcTagUseCase } from './UpdateNfcTag_UseCase';

const TAG_ID = '00000000-0000-4000-8000-0000000000f1';
const USER_ID = '00000000-0000-4000-8000-0000000000e1';
const UID = '04A1B2C3';

const makeSut = async () => {
  const users = new InMemoryUserRepository();
  await users.save(makeUser({ id: USER_ID, nome: 'Maria Souza' }));
  const tags = new InMemoryNfcTagRepository(users);
  return { sut: new UpdateNfcTagUseCase(tags), tags };
};

describe('UpdateNfcTag', () => {
  it('deve desativar a tag', async () => {
    const { sut, tags } = await makeSut();
    await tags.save(makeNfcTag({ id: TAG_ID, usuarioId: USER_ID, uid: UID }));

    const updated = await sut.execute(TAG_ID, { ativa: false });

    expect(updated).toMatchObject({
      id: TAG_ID,
      ativa: false,
      usuario: { id: USER_ID, nome: 'Maria Souza' },
    });
    expect((await tags.findByUid(UID))?.ativa).toBe(false);
  });

  it('deve reativar a tag', async () => {
    const { sut, tags } = await makeSut();
    await tags.save(makeNfcTag({ id: TAG_ID, usuarioId: USER_ID, uid: UID, ativa: false }));

    const updated = await sut.execute(TAG_ID, { ativa: true });

    expect(updated.ativa).toBe(true);
    expect((await tags.findByUid(UID))?.ativa).toBe(true);
  });

  it('deve lançar 404 quando a tag não existe', async () => {
    const { sut } = await makeSut();

    await expect(sut.execute(TAG_ID, { ativa: false })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });
});
