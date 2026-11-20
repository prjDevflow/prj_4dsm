import { ApiError } from '@/service/ApiError';
import {
  DUPLICATED_UID,
  enrollErrorMessage,
  INVALID_UID,
  tagSaveError,
  toggleErrorMessage,
} from './tags.messages';

const error = (
  status: number | null,
  code: string,
  details: { field: string; message: string }[] = [],
) => new ApiError(status, code, '', details);

describe('tagSaveError', () => {
  it('tag repetida vai para o campo do código', () => {
    expect(tagSaveError(error(409, 'TAG_JA_CADASTRADA'))).toEqual({
      fields: { uid: DUPLICATED_UID },
      banner: null,
    });
  });

  it('o 422 do código vira a regra que a pessoa entende', () => {
    expect(
      tagSaveError(error(422, 'VALIDATION_ERROR', [{ field: 'uid', message: 'hexadecimal' }])),
    ).toEqual({ fields: { uid: INVALID_UID }, banner: null });
  });

  it('o 422 da pessoa inativa fica no campo da pessoa', () => {
    expect(
      tagSaveError(
        error(422, 'VALIDATION_ERROR', [{ field: 'usuarioId', message: 'usuário inativo' }]),
      ),
    ).toEqual({ fields: { usuarioId: 'Usuário inativo.' }, banner: null });
  });

  it('um 422 sem campo na tela aparece na faixa', () => {
    expect(
      tagSaveError(error(422, 'VALIDATION_ERROR', [{ field: 'outro', message: 'inválido' }]))
        .banner,
    ).toBe('Confira os dados e tente de novo.');
  });

  it.each([
    [404, 'Esta pessoa não existe mais. Escolha outra.'],
    [403, 'Você não tem permissão para gerenciar tags.'],
    [500, 'Não foi possível salvar agora. Tente novamente em instantes.'],
  ])('%i aparece na faixa', (status, banner) => {
    expect(tagSaveError(error(status, 'X'))).toEqual({ fields: {}, banner });
  });

  it('sem rede, avisa da conexão', () => {
    expect(tagSaveError(error(null, 'NETWORK')).banner).toMatch(/Sem conexão/);
  });
});

describe('mensagens do modo de cadastro e do interruptor', () => {
  it.each([
    [422, 'Esta pessoa está inativa. Ative o cadastro antes de vincular uma tag.'],
    [404, 'Terminal ou pessoa não encontrados. Volte e escolha de novo.'],
    [500, 'Não foi possível falar com o terminal agora. Tente de novo.'],
  ])('ligar o modo com %i', (status, message) => {
    expect(enrollErrorMessage(error(status, 'X'))).toBe(message);
  });

  it('mudar a tag sem sucesso pede para tentar de novo', () => {
    expect(toggleErrorMessage(error(500, 'X'))).toBe(
      'Não foi possível mudar a tag agora. Tente de novo.',
    );
    expect(toggleErrorMessage(error(null, 'NETWORK'))).toMatch(/Sem conexão/);
  });
});
