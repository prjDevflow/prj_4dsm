import { ApiError } from '@/service/ApiError';
import { detailsToFields, loadErrorMessage, sentence } from './apiMessages';

describe('apiMessages', () => {
  it('loadErrorMessage separa sem rede e tempo esgotado do erro geral', () => {
    expect(loadErrorMessage(new ApiError(null, 'NETWORK', ''))).toBe(
      'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
    );
    expect(loadErrorMessage(new ApiError(null, 'TIMEOUT', ''))).toBe(
      'O servidor demorou para responder. Tente de novo.',
    );
    expect(loadErrorMessage(new ApiError(500, 'INTERNAL_ERROR', ''))).toBe(
      'Tente novamente em instantes.',
    );
  });

  it('sentence põe maiúscula e ponto final', () => {
    expect(sentence('deve ter no mínimo 3 caracteres')).toBe('Deve ter no mínimo 3 caracteres.');
    expect(sentence('Já termina.')).toBe('Já termina.');
  });

  it('detailsToFields leva cada detalhe ao campo e diz se algum ficou sem campo', () => {
    const error = new ApiError(422, 'VALIDATION_ERROR', 'Dados inválidos', [
      { field: 'nome', message: 'obrigatório' },
      { field: 'corpo', message: 'informe ao menos um campo' },
    ]);

    expect(detailsToFields(error, ['nome', 'endereco'])).toEqual({
      fields: { nome: 'Obrigatório.' },
      allOnFields: false,
    });
    expect(detailsToFields(error, ['nome', 'corpo'])).toEqual({
      fields: { nome: 'Obrigatório.', corpo: 'Informe ao menos um campo.' },
      allOnFields: true,
    });
  });
});
