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

  it.todo('deve reativar uma tag desativada');
  it.todo('deve mudar só o campo ativa e manter UID, usuário, descrição e data');
  it.todo('deve aceitar repetir o estado que a tag já tem');
  it.todo('deve rejeitar tag inexistente com 404');
});
