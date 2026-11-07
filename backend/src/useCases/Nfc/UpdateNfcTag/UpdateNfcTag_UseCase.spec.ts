import { describe, expect, it } from 'vitest';
import { InMemoryNfcTagRepository } from '../../../../test/doubles/InMemoryNfcTagRepository';
import { makeNfcTag } from '../../../../test/factories/makeNfcTag';
import { UpdateNfcTagUseCase } from './UpdateNfcTag_UseCase';

const makeSut = () => {
  const tags = new InMemoryNfcTagRepository();
  const sut = new UpdateNfcTagUseCase(tags);
  return { sut, tags };
};

describe('UpdateNfcTag', () => {
  it('deve desativar a tag e devolvê-la desativada', async () => {
    const { sut, tags } = makeSut();
    const tag = makeNfcTag({ ativa: true });
    await tags.seed(tag);

    const updated = await sut.execute(tag.id, { ativa: false });

    expect(updated).toEqual({ ...tag, ativa: false });
    expect(tags.all()).toEqual([{ ...tag, ativa: false }]);
  });

  it('deve reativar uma tag desativada', async () => {
    const { sut, tags } = makeSut();
    const tag = makeNfcTag({ ativa: false });
    await tags.seed(tag);

    const updated = await sut.execute(tag.id, { ativa: true });

    expect(updated.ativa).toBe(true);
    expect(tags.all()[0]?.ativa).toBe(true);
  });

  it('deve mudar só o campo ativa e manter UID, usuário, descrição e data', async () => {
    const { sut, tags } = makeSut();
    const tag = makeNfcTag({ descricao: 'Cartão azul', uid: '04A1B2C3D4' });
    const other = makeNfcTag({ id: '00000000-0000-4000-8000-0000000000f2', uid: '05B2C3D4' });
    await tags.seed(tag);
    await tags.seed(other);

    await sut.execute(tag.id, { ativa: false });

    expect(tags.all()).toEqual([{ ...tag, ativa: false }, other]);
  });

  it('deve aceitar repetir o estado que a tag já tem', async () => {
    const { sut, tags } = makeSut();
    const tag = makeNfcTag({ ativa: true });
    await tags.seed(tag);

    const updated = await sut.execute(tag.id, { ativa: true });

    expect(updated).toEqual(tag);
  });

  it('deve rejeitar tag inexistente com 404', async () => {
    const { sut } = makeSut();

    const error = await sut
      .execute('00000000-0000-4000-8000-0000000000ff', { ativa: false })
      .catch((e) => e);

    expect(error).toMatchObject({ code: 'NOT_FOUND', status: 404, message: 'Tag não encontrada' });
  });
});
