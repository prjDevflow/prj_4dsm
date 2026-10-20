import { describe, it, expect } from 'vitest';
import { todayInSaoPaulo } from './todayInSaoPaulo';

describe('todayInSaoPaulo', () => {
  it('deve devolver o dia anterior quando ainda é madrugada em São Paulo', () => {
    expect(todayInSaoPaulo(new Date('2026-10-20T02:30:00Z'))).toBe('2026-10-19');
  });

  it('deve devolver o dia seguinte exatamente à meia-noite de São Paulo', () => {
    expect(todayInSaoPaulo(new Date('2026-10-20T03:00:00Z'))).toBe('2026-10-20');
  });

  it('deve manter o dia um milissegundo antes da meia-noite de São Paulo', () => {
    expect(todayInSaoPaulo(new Date('2026-10-20T02:59:59.999Z'))).toBe('2026-10-19');
  });

  it('deve atravessar a virada do ano no fuso de São Paulo', () => {
    expect(todayInSaoPaulo(new Date('2027-01-01T02:59:59Z'))).toBe('2026-12-31');
    expect(todayInSaoPaulo(new Date('2027-01-01T03:00:00Z'))).toBe('2027-01-01');
  });
});
