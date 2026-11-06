import { describe, expect, it } from 'vitest';
import { InMemoryNfcTagRepository } from '../../../../test/doubles/InMemoryNfcTagRepository';
import { InMemoryUserRepository } from '../../../../test/doubles/InMemoryUserRepository';
import { makeNfcTag } from '../../../../test/factories/makeNfcTag';
import { makeUser } from '../../../../test/factories/makeUser';
import { ListNfcTagsUseCase } from './ListNfcTags_UseCase';

const MARIA = '00000000-0000-4000-8000-0000000000e1';
const JOAO = '00000000-0000-4000-8000-0000000000e2';
const idOf = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const page = { page: 1, pageSize: 20 };

// Two tags of Maria (one inactive) and one of João.
const makeSut = async () => {
  const users = new InMemoryUserRepository();
  await users.save(makeUser({ id: MARIA, nome: 'Maria Souza' }));
  await users.save(makeUser({ id: JOAO, nome: 'João Lima', email: 'joao@teste.local' }));
  const tags = new InMemoryNfcTagRepository(users);
  await tags.save(makeNfcTag({ id: idOf(1), usuarioId: MARIA, uid: '04A1B2C1' }));
  await tags.save(makeNfcTag({ id: idOf(2), usuarioId: MARIA, uid: '04A1B2C2', ativa: false }));
  await tags.save(makeNfcTag({ id: idOf(3), usuarioId: JOAO, uid: '04A1B2C3' }));
  return { sut: new ListNfcTagsUseCase(tags) };
};

const uids = (result: { data: { uid: string }[] }) => result.data.map((tag) => tag.uid).sort();

describe('ListNfcTags', () => {
  it('deve devolver data, page, pageSize e total', async () => {
    const { sut } = await makeSut();

    const result = await sut.execute({ page: 2, pageSize: 2 });

    expect(result).toMatchObject({ page: 2, pageSize: 2, total: 3 });
    expect(result.data).toHaveLength(1);
    expect(Object.keys(result.data[0]!).sort()).toEqual(
      ['ativa', 'criadaEm', 'descricao', 'id', 'uid', 'usuario'].sort(),
    );
  });

  it('deve trazer o nome do usuário em cada tag', async () => {
    const { sut } = await makeSut();

    const result = await sut.execute({ ...page, usuarioId: JOAO });

    expect(result.data[0]?.usuario).toEqual({ id: JOAO, nome: 'João Lima' });
  });

  it('deve filtrar por usuarioId', async () => {
    const { sut } = await makeSut();

    const result = await sut.execute({ ...page, usuarioId: MARIA });

    expect(uids(result)).toEqual(['04A1B2C1', '04A1B2C2']);
    expect(result.total).toBe(2);
  });

  it('deve filtrar por ativa, inclusive false', async () => {
    const { sut } = await makeSut();

    expect(uids(await sut.execute({ ...page, ativa: true }))).toEqual(['04A1B2C1', '04A1B2C3']);
    expect(uids(await sut.execute({ ...page, ativa: false }))).toEqual(['04A1B2C2']);
  });

  it('deve combinar os dois filtros', async () => {
    const { sut } = await makeSut();

    const result = await sut.execute({ ...page, usuarioId: MARIA, ativa: true });

    expect(uids(result)).toEqual(['04A1B2C1']);
  });
});
