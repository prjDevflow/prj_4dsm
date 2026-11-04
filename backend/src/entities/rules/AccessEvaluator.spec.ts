import { describe, expect, it } from 'vitest';
import { makeAuthorization } from '../../../test/factories/makeAuthorization';
import type { Authorization } from '../Authorization';
import { AccessEvaluator, type AccessEvaluation } from './AccessEvaluator';

const USER = { id: '00000000-0000-4000-8000-0000000000b1' };
const POINT_ID = '00000000-0000-4000-8000-0000000000c1';
// 12:00 de 21/10/2026 em São Paulo.
const NOW = new Date('2026-10-21T15:00:00Z');

/** Vale hoje (20 a 22/10), das 08:00 às 18:00, com 3 usos livres, para o usuário e o ponto do teste. */
const make = (overrides: Partial<Authorization> = {}) =>
  makeAuthorization({
    usuarioId: USER.id,
    accessPointId: POINT_ID,
    dataInicio: '2026-10-20',
    dataFim: '2026-10-22',
    ...overrides,
  });

const evaluate = (authorizations: Authorization[], now = NOW): AccessEvaluation =>
  AccessEvaluator.evaluate({ user: USER, accessPointId: POINT_ID, authorizations, now });

const reasonOf = (evaluation: AccessEvaluation) =>
  evaluation.granted ? null : evaluation.reason;

describe('AccessEvaluator', () => {
  describe('verificação 6: existe autorização para o ponto', () => {
    it('deve negar com SEM_AUTORIZACAO quando o usuário não tem nenhuma', () => {
      expect(reasonOf(evaluate([]))).toBe('SEM_AUTORIZACAO');
    });

    it('deve negar com SEM_AUTORIZACAO quando a autorização é de outro ponto de acesso', () => {
      const other = make({ accessPointId: '00000000-0000-4000-8000-0000000000c2' });

      expect(reasonOf(evaluate([other]))).toBe('SEM_AUTORIZACAO');
    });

    it('deve negar com SEM_AUTORIZACAO quando a autorização é de outro usuário', () => {
      const other = make({ usuarioId: '00000000-0000-4000-8000-0000000000b2' });

      expect(reasonOf(evaluate([other]))).toBe('SEM_AUTORIZACAO');
    });
  });

  describe('verificação 7: há alguma não cancelada', () => {
    it('deve negar com AUTORIZACAO_CANCELADA quando só há canceladas', () => {
      const cancelled = [
        make({ id: 'a1', situacao: 'CANCELADA' }),
        make({ id: 'a2', situacao: 'CANCELADA' }),
      ];

      expect(reasonOf(evaluate(cancelled))).toBe('AUTORIZACAO_CANCELADA');
    });

    it('deve ignorar a cancelada ao julgar as demais', () => {
      const cancelled = make({ id: 'a1', situacao: 'CANCELADA' });
      const expired = make({ id: 'a2', dataInicio: '2026-09-01', dataFim: '2026-09-30' });

      expect(reasonOf(evaluate([cancelled, expired]))).toBe('FORA_DO_PERIODO');
    });
  });

  describe('verificação 8: alguma dentro da data e do horário', () => {
    it('deve negar com FORA_DO_PERIODO antes do início', () => {
      const future = make({ dataInicio: '2026-10-22', dataFim: '2026-10-30' });

      expect(reasonOf(evaluate([future]))).toBe('FORA_DO_PERIODO');
    });

    it('deve negar com FORA_DO_PERIODO depois do fim, mesmo com a situação ainda ATIVA', () => {
      const past = make({ dataInicio: '2026-10-01', dataFim: '2026-10-20' });

      expect(reasonOf(evaluate([past]))).toBe('FORA_DO_PERIODO');
    });

    it('deve negar com FORA_DO_PERIODO dentro do período mas fora do horário', () => {
      const evening = new Date('2026-10-21T21:01:00Z'); // 18:01 em São Paulo

      expect(reasonOf(evaluate([make()], evening))).toBe('FORA_DO_PERIODO');
    });

    it('deve aceitar no último minuto do horário (18:00)', () => {
      const lastMinute = new Date('2026-10-21T21:00:00Z');

      expect(evaluate([make()], lastMinute).granted).toBe(true);
    });
  });

  describe('verificação 9: alguma com usos restantes', () => {
    it('deve negar com USOS_ESGOTADOS quando a da janela não tem usos', () => {
      const spent = make({ usosPermitidos: 2, usosRealizados: 2 });

      expect(reasonOf(evaluate([spent]))).toBe('USOS_ESGOTADOS');
    });

    it('deve negar com USOS_ESGOTADOS quando a única com usos livres está fora da janela', () => {
      const spent = make({ id: 'a1', usosPermitidos: 1, usosRealizados: 1 });
      const future = make({ id: 'a2', dataInicio: '2026-10-25', dataFim: '2026-10-30' });

      expect(reasonOf(evaluate([spent, future]))).toBe('USOS_ESGOTADOS');
    });
  });

  describe('escolha da autorização', () => {
    it('deve devolver a autorização elegível', () => {
      const only = make({ id: 'a1' });

      expect(evaluate([only])).toEqual({ granted: true, authorization: only });
    });

    it('deve escolher a de dataFim mais próxima entre as elegíveis', () => {
      const later = make({ id: 'a1', dataFim: '2026-10-30' });
      const sooner = make({ id: 'a2', dataFim: '2026-10-22' });
      const middle = make({ id: 'a3', dataFim: '2026-10-25' });

      const result = evaluate([later, sooner, middle]);

      expect(result.granted && result.authorization.id).toBe('a2');
    });

    it('deve pular cancelada, esgotada e fora da janela ao escolher', () => {
      const cancelled = make({ id: 'a1', dataFim: '2026-10-21', situacao: 'CANCELADA' });
      const spent = make({ id: 'a2', dataFim: '2026-10-21', usosPermitidos: 1, usosRealizados: 1 });
      const notYet = make({ id: 'a3', dataInicio: '2026-10-22', dataFim: '2026-10-22' });
      const eligible = make({ id: 'a4', dataFim: '2026-10-30' });

      const result = evaluate([cancelled, spent, notYet, eligible]);

      expect(result.granted && result.authorization.id).toBe('a4');
    });

    it('deve desempatar pelo id, qualquer que seja a ordem de entrada', () => {
      const a = make({ id: 'a-1', dataFim: '2026-10-22' });
      const b = make({ id: 'a-2', dataFim: '2026-10-22' });

      const forward = evaluate([a, b]);
      const backward = evaluate([b, a]);

      expect(forward.granted && forward.authorization.id).toBe('a-1');
      expect(backward.granted && backward.authorization.id).toBe('a-1');
    });
  });
});
