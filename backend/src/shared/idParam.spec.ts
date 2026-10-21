import { describe, expect, it } from 'vitest';
import { parseIdParam } from './idParam';

describe('parseIdParam', () => {
  it('deve devolver o id quando tem o formato 8-4-4-4-12, inclusive o dos ids do seed', () => {
    expect(parseIdParam('5eed0000-0000-4000-8000-000000000001')).toBe(
      '5eed0000-0000-4000-8000-000000000001',
    );
    expect(parseIdParam('7C9E6679-7425-40DE-944B-E07FC1F90AE7')).toBe(
      '7C9E6679-7425-40DE-944B-E07FC1F90AE7',
    );
  });

  it.each(['nao-e-uuid', '', '5eed0000-0000-4000-8000-00000000000', undefined, ['a'], 42])(
    'deve lançar NotFoundError quando o valor é %j',
    (value) => {
      expect(() => parseIdParam(value)).toThrowError(
        expect.objectContaining({ code: 'NOT_FOUND', status: 404 }),
      );
    },
  );

  it('deve usar a mensagem recebida no NotFoundError', () => {
    expect(() => parseIdParam('x', 'Usuário não encontrado')).toThrowError(
      'Usuário não encontrado',
    );
  });
});
