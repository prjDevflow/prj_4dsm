import { ApiError } from '@/service/ApiError';
import { authorizationSaveError } from './authorizationForm.messages';

describe('authorizationSaveError', () => {
  it('404 de pessoa ou local pede para atualizar a tela', () => {
    expect(
      authorizationSaveError(new ApiError(404, 'NOT_FOUND', 'Usuário não encontrado')),
    ).toEqual({
      fields: {},
      banner: 'A pessoa ou o local não existe mais. Atualize a tela.',
    });
  });

  it('422 leva cada detalhe ao campo indicado', () => {
    const error = new ApiError(422, 'VALIDATION_ERROR', 'Dados inválidos', [
      { field: 'usuarioId', message: 'o usuário está inativo' },
      { field: 'dataFim', message: 'não pode estar no passado' },
    ]);

    expect(authorizationSaveError(error)).toEqual({
      fields: { usuarioId: 'O usuário está inativo.', dataFim: 'Não pode estar no passado.' },
      banner: null,
    });
  });

  it('sem rede e o resto viram textos sem código técnico', () => {
    expect(authorizationSaveError(new ApiError(null, 'NETWORK', '')).banner).toBe(
      'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
    );
    expect(authorizationSaveError(new ApiError(500, 'INTERNAL_ERROR', '')).banner).toBe(
      'Não foi possível salvar agora. Tente novamente em instantes.',
    );
  });
});
