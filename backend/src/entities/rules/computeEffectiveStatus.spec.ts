import { describe, it, expect } from 'vitest';
import { computeEffectiveStatus } from './computeEffectiveStatus';
import { makeAuthorization } from '../../../test/factories/makeAuthorization';

// 12:00 in São Paulo on 2026-10-20.
const noon = new Date('2026-10-20T15:00:00Z');

describe('computeEffectiveStatus', () => {
  it('deve devolver ATIVA para uma autorização dentro do período e com usos restantes', () => {
    const authorization = makeAuthorization({ dataFim: '2026-10-31', usosRealizados: 1 });

    expect(computeEffectiveStatus(authorization, noon)).toBe('ATIVA');
  });

  it('deve devolver CANCELADA mesmo quando também está expirada e esgotada', () => {
    const authorization = makeAuthorization({
      situacao: 'CANCELADA',
      dataFim: '2026-10-01',
      usosPermitidos: 3,
      usosRealizados: 3,
    });

    expect(computeEffectiveStatus(authorization, noon)).toBe('CANCELADA');
  });

  it('deve manter ATIVA no último dia, quando dataFim é igual a hoje', () => {
    const authorization = makeAuthorization({ dataFim: '2026-10-20' });

    expect(computeEffectiveStatus(authorization, noon)).toBe('ATIVA');
  });

  it('deve devolver EXPIRADA no dia seguinte ao dataFim', () => {
    const authorization = makeAuthorization({ dataFim: '2026-10-19' });

    expect(computeEffectiveStatus(authorization, noon)).toBe('EXPIRADA');
  });

  it('deve usar o dia de São Paulo, não o de UTC, para decidir a expiração', () => {
    const authorization = makeAuthorization({ dataFim: '2026-10-20' });
    const stillDay20InSaoPaulo = new Date('2026-10-21T02:30:00Z');
    const day21InSaoPaulo = new Date('2026-10-21T03:00:00Z');

    expect(computeEffectiveStatus(authorization, stillDay20InSaoPaulo)).toBe('ATIVA');
    expect(computeEffectiveStatus(authorization, day21InSaoPaulo)).toBe('EXPIRADA');
  });

  it('deve devolver ESGOTADA quando os usos realizados igualam os permitidos', () => {
    const authorization = makeAuthorization({ usosPermitidos: 3, usosRealizados: 3 });

    expect(computeEffectiveStatus(authorization, noon)).toBe('ESGOTADA');
  });

  it('deve manter ATIVA quando falta exatamente um uso', () => {
    const authorization = makeAuthorization({ usosPermitidos: 3, usosRealizados: 2 });

    expect(computeEffectiveStatus(authorization, noon)).toBe('ATIVA');
  });

  it('deve tratar usos realizados acima do permitido como ESGOTADA', () => {
    const authorization = makeAuthorization({ usosPermitidos: 3, usosRealizados: 4 });

    expect(computeEffectiveStatus(authorization, noon)).toBe('ESGOTADA');
  });

  it('deve devolver EXPIRADA, e não ESGOTADA, quando está expirada e esgotada ao mesmo tempo', () => {
    const authorization = makeAuthorization({
      dataFim: '2026-10-19',
      usosPermitidos: 3,
      usosRealizados: 3,
    });

    expect(computeEffectiveStatus(authorization, noon)).toBe('EXPIRADA');
  });
});
