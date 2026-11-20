import { formatCoordinate, parseCoordinate } from './coordinates';

describe('coordenadas', () => {
  describe('parseCoordinate', () => {
    it('aceita ponto ou vírgula decimal, sinal e espaços nas pontas', () => {
      expect(parseCoordinate('-23,30512')).toBe(-23.30512);
      expect(parseCoordinate(' -45.96551 ')).toBe(-45.96551);
      expect(parseCoordinate('0')).toBe(0);
      expect(parseCoordinate('+12,5')).toBe(12.5);
    });

    it('texto que não é número vira null', () => {
      for (const text of ['', ' ', 'abc', '1,2,3', '1.2.3', '--1', '12a', ',5', '5,']) {
        expect(parseCoordinate(text)).toBeNull();
      }
    });
  });

  describe('formatCoordinate', () => {
    it('mostra com vírgula e no máximo 6 casas, sem zeros sobrando', () => {
      expect(formatCoordinate(-23.30512)).toBe('-23,30512');
      expect(formatCoordinate(-45.965512345)).toBe('-45,965512');
      expect(formatCoordinate(10)).toBe('10');
      expect(formatCoordinate(-0.5)).toBe('-0,5');
    });
  });
});
