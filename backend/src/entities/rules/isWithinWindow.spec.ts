import { describe, expect, it } from 'vitest';
import { makeAuthorization } from '../../../test/factories/makeAuthorization';
import { isWithinWindow } from './isWithinWindow';

// Vale de 20 a 22/10/2026, das 08:00 às 18:00 de São Paulo (UTC-3).
const authorization = makeAuthorization({
  dataInicio: '2026-10-20',
  dataFim: '2026-10-22',
  horaInicio: '08:00',
  horaFim: '18:00',
});

const at = (iso: string) => isWithinWindow(authorization, new Date(iso));

describe('isWithinWindow', () => {
  describe('horário', () => {
    it('deve passar exatamente em horaInicio', () => {
      expect(at('2026-10-21T11:00:00Z')).toBe(true);
    });

    it('deve negar um minuto antes de horaInicio', () => {
      expect(at('2026-10-21T10:59:00Z')).toBe(false);
    });

    it('deve passar exatamente em horaFim', () => {
      expect(at('2026-10-21T21:00:00Z')).toBe(true);
    });

    it('deve passar durante o minuto de horaFim (os segundos não contam)', () => {
      expect(at('2026-10-21T21:00:59Z')).toBe(true);
    });

    it('deve negar um minuto depois de horaFim', () => {
      expect(at('2026-10-21T21:01:00Z')).toBe(false);
    });
  });

  describe('período', () => {
    it('deve passar no primeiro dia', () => {
      expect(at('2026-10-20T15:00:00Z')).toBe(true);
    });

    it('deve passar no último dia', () => {
      expect(at('2026-10-22T15:00:00Z')).toBe(true);
    });

    it('deve negar no dia seguinte ao último', () => {
      expect(at('2026-10-23T15:00:00Z')).toBe(false);
    });

    it('deve negar antes do primeiro dia', () => {
      expect(at('2026-10-19T15:00:00Z')).toBe(false);
    });
  });

  describe('fuso de São Paulo', () => {
    const lateWindow = makeAuthorization({
      dataInicio: '2026-10-20',
      dataFim: '2026-10-22',
      horaInicio: '08:00',
      horaFim: '23:59',
    });

    it('deve usar o dia de São Paulo, não o do UTC, às 23:30 do último dia', () => {
      // 02:30Z de 23/10 ainda é 22/10, 23:30 em São Paulo.
      expect(isWithinWindow(lateWindow, new Date('2026-10-23T02:30:00Z'))).toBe(true);
    });

    it('deve negar quando o dia de São Paulo já é o seguinte ao último', () => {
      // 03:00Z de 23/10 é 00:00 de 23/10 em São Paulo.
      expect(isWithinWindow(lateWindow, new Date('2026-10-23T03:00:00Z'))).toBe(false);
    });
  });
});
