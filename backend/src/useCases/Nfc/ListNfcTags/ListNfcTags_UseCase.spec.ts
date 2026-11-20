import { describe, expect, it } from 'vitest';
import { InMemoryNfcTagRepository } from '../../../../test/doubles/InMemoryNfcTagRepository';
import { makeNfcTag } from '../../../../test/factories/makeNfcTag';
import { ListNfcTagsUseCase } from './ListNfcTags_UseCase';

const ANA = '00000000-0000-4000-8000-0000000000a1';
const BRUNO = '00000000-0000-4000-8000-0000000000b2';
const at = (day: number) => new Date(`2026-10-${String(day).padStart(2, '0')}T12:00:00Z`);

const makeSut = async () => {
  const tags = new InMemoryNfcTagRepository();
  // Oldest to newest: t1 (Ana, active), t2 (Bruno, inactive), t3 (Ana, inactive), t4 (Bruno, active).
  await tags.seed(makeNfcTag({ id: 't1', uid: '01000001', usuarioId: ANA, criadaEm: at(1) }));
  await tags.seed(
    makeNfcTag({ id: 't2', uid: '01000002', usuarioId: BRUNO, ativa: false, criadaEm: at(2) }),
  );
  await tags.seed(
    makeNfcTag({ id: 't3', uid: '01000003', usuarioId: ANA, ativa: false, criadaEm: at(3) }),
  );
  await tags.seed(makeNfcTag({ id: 't4', uid: '01000004', usuarioId: BRUNO, criadaEm: at(4) }));
  const sut = new ListNfcTagsUseCase(tags);
  return { sut, tags };
};

const defaults = { page: 1, pageSize: 20 };
const ids = (result: { data: { id: string }[] }) => result.data.map((tag) => tag.id);

describe('ListNfcTags', () => {
  it('deve devolver as tags da mais nova para a mais antiga, com página, tamanho e total', async () => {
    const { sut } = await makeSut();

    const result = await sut.execute(defaults);

    expect(ids(result)).toEqual(['t4', 't3', 't2', 't1']);
    expect(result).toMatchObject({ page: 1, pageSize: 20, total: 4 });
  });

  it('deve desempatar pelo id, do maior para o menor, quando a data é a mesma', async () => {
    const tags = new InMemoryNfcTagRepository();
    await tags.seed(makeNfcTag({ id: 'a', uid: '02000001', criadaEm: at(1) }));
    await tags.seed(makeNfcTag({ id: 'c', uid: '02000002', criadaEm: at(1) }));
    await tags.seed(makeNfcTag({ id: 'b', uid: '02000003', criadaEm: at(1) }));

    const result = await new ListNfcTagsUseCase(tags).execute(defaults);

    expect(ids(result)).toEqual(['c', 'b', 'a']);
  });

  it('deve filtrar por usuarioId', async () => {
    const { sut } = await makeSut();

    const result = await sut.execute({ ...defaults, usuarioId: ANA });

    expect(ids(result)).toEqual(['t3', 't1']);
    expect(result.total).toBe(2);
  });

  it('deve filtrar por ativa verdadeiro e por ativa falso', async () => {
    const { sut } = await makeSut();

    expect(ids(await sut.execute({ ...defaults, ativa: true }))).toEqual(['t4', 't1']);
    expect(ids(await sut.execute({ ...defaults, ativa: false }))).toEqual(['t3', 't2']);
  });

  it('deve combinar usuarioId e ativa', async () => {
    const { sut } = await makeSut();

    const result = await sut.execute({ ...defaults, usuarioId: BRUNO, ativa: false });

    expect(ids(result)).toEqual(['t2']);
    expect(result.total).toBe(1);
  });

  it('deve paginar e manter o total de antes da página', async () => {
    const { sut } = await makeSut();

    const second = await sut.execute({ page: 2, pageSize: 3 });
    const beyond = await sut.execute({ page: 3, pageSize: 3 });

    expect(ids(second)).toEqual(['t1']);
    expect(second).toMatchObject({ page: 2, pageSize: 3, total: 4 });
    expect(beyond.data).toEqual([]);
    expect(beyond.total).toBe(4);
  });
});
