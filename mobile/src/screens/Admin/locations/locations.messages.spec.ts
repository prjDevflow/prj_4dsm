import { ApiError } from '@/service/ApiError';
import { locationSaveError } from './locations.messages';

describe('locationSaveError', () => {
  it('409 LOCAL_COM_AUTORIZACOES_ATIVAS vai para a faixa com o texto do card', () => {
    const error = new ApiError(409, 'LOCAL_COM_AUTORIZACOES_ATIVAS', 'qualquer');

    for (const form of ['building', 'accessPoint'] as const) {
      expect(locationSaveError(error, form)).toEqual({
        fields: {},
        banner: 'Este local ainda tem autorizações ativas. Cancele-as antes.',
      });
    }
  });

  it('409 CONFLICT no ponto vai para a identificação; no terminal, para o ponto de acesso', () => {
    const error = new ApiError(409, 'CONFLICT', 'qualquer');

    expect(locationSaveError(error, 'accessPoint')).toEqual({
      fields: { identificacao: 'Já existe um local com esta identificação neste edifício.' },
      banner: null,
    });
    expect(locationSaveError(error, 'terminal')).toEqual({
      fields: { accessPointId: 'Este ponto de acesso já tem um terminal.' },
      banner: null,
    });
  });

  it('422 leva cada detalhe ao campo do formulário', () => {
    const error = new ApiError(422, 'VALIDATION_ERROR', 'Dados inválidos', [
      { field: 'latitude', message: 'deve estar entre -90 e 90' },
      { field: 'buildingId', message: 'o edifício está inativo' },
    ]);

    expect(locationSaveError(error, 'accessPoint')).toEqual({
      fields: {
        latitude: 'Deve estar entre -90 e 90.',
        buildingId: 'O edifício está inativo.',
      },
      banner: null,
    });
  });

  it('422 de campo que a tela não tem (reativar ponto de edifício inativo) vai para a faixa', () => {
    const error = new ApiError(422, 'VALIDATION_ERROR', 'Dados inválidos', [
      { field: 'ativo', message: 'o edifício deste ponto está inativo' },
    ]);

    expect(locationSaveError(error, 'accessPoint')).toEqual({
      fields: {},
      banner: 'O edifício deste ponto está inativo.',
    });
  });

  it('sem rede, 404 e o resto viram textos sem código técnico', () => {
    expect(locationSaveError(new ApiError(null, 'NETWORK', ''), 'building').banner).toBe(
      'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
    );
    expect(locationSaveError(new ApiError(404, 'NOT_FOUND', ''), 'terminal').banner).toBe(
      'Este cadastro não existe mais. Volte para a lista.',
    );
    expect(locationSaveError(new ApiError(500, 'INTERNAL_ERROR', ''), 'building').banner).toBe(
      'Não foi possível salvar agora. Tente novamente em instantes.',
    );
  });
});
