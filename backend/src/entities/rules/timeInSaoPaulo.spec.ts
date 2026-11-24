import { describe, expect, it } from 'vitest';
import { timeInSaoPaulo } from './timeInSaoPaulo';

describe('timeInSaoPaulo', () => {
  it('deve converter UTC para o horário de São Paulo (UTC-3)', () => {
    expect(timeInSaoPaulo(new Date('2026-10-20T11:00:00Z'))).toBe('08:00');
    expect(timeInSaoPaulo(new Date('2026-10-20T21:01:00Z'))).toBe('18:01');
  });

  it('deve descartar os segundos', () => {
    expect(timeInSaoPaulo(new Date('2026-10-20T21:00:59.999Z'))).toBe('18:00');
  });

  it('deve usar 00:00 (e não 24:00) à meia-noite de São Paulo', () => {
    expect(timeInSaoPaulo(new Date('2026-10-21T03:00:00Z'))).toBe('00:00');
  });

  it('deve mostrar a noite do dia anterior quando o UTC já virou o dia', () => {
    expect(timeInSaoPaulo(new Date('2026-10-21T02:59:00Z'))).toBe('23:59');
  });
});
