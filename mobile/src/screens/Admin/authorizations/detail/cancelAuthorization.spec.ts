import { ApiError } from '@/service/ApiError';
import { cancelFormSchema, cancelSaveError } from './cancelAuthorization';

describe('cancelFormSchema', () => {
  it('o motivo é opcional e sai sem espaços nas pontas', () => {
    expect(cancelFormSchema.parse({ motivo: '' })).toEqual({ motivo: '' });
    expect(cancelFormSchema.parse({ motivo: '  Pedido da moradora ' })).toEqual({
      motivo: 'Pedido da moradora',
    });
  });

  it('200 caracteres passam; 201 não', () => {
    expect(cancelFormSchema.safeParse({ motivo: 'a'.repeat(200) }).success).toBe(true);

    const result = cancelFormSchema.safeParse({ motivo: 'a'.repeat(201) });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('O motivo pode ter no máximo 200 caracteres.');
  });
});

describe('cancelSaveError', () => {
  it('422 no motivo vai para o campo', () => {
    const error = new ApiError(422, 'VALIDATION_ERROR', 'Dados inválidos', [
      { field: 'motivo', message: 'deve ter no máximo 200 caracteres' },
    ]);

    expect(cancelSaveError(error)).toEqual({
      motivo: 'Deve ter no máximo 200 caracteres.',
      banner: null,
    });
  });

  it('404 explica que a autorização não existe mais', () => {
    expect(cancelSaveError(new ApiError(404, 'NOT_FOUND', ''))).toEqual({
      banner: 'Esta autorização não existe mais. Volte para a lista.',
    });
  });

  it('sem rede, tempo esgotado e o resto viram textos sem código técnico', () => {
    expect(cancelSaveError(new ApiError(null, 'NETWORK', '')).banner).toBe(
      'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
    );
    expect(cancelSaveError(new ApiError(null, 'TIMEOUT', '')).banner).toBe(
      'O servidor demorou para responder. Tente de novo.',
    );
    expect(cancelSaveError(new ApiError(500, 'INTERNAL_ERROR', '')).banner).toBe(
      'Não foi possível cancelar agora. Tente novamente em instantes.',
    );
  });
});
