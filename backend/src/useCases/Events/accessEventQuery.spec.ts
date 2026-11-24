import { describe, expect, it } from 'vitest';
import { ListAccessEventsSchema } from './ListAccessEvents/ListAccessEvents_DTO';
import { periodIsOrdered } from './accessEventQuery';

const T = new Date('2026-10-20T14:00:00.000Z');
const after = (ms: number) => new Date(T.getTime() + ms);

describe('periodIsOrdered', () => {
  it('deve aceitar de antes de ate', () => {
    expect(periodIsOrdered({ de: T, ate: after(1) })).toBe(true);
  });

  it('deve aceitar de igual a ate, que é um instante só', () => {
    expect(periodIsOrdered({ de: T, ate: new Date(T) })).toBe(true);
  });

  it('deve recusar de um milissegundo depois de ate', () => {
    expect(periodIsOrdered({ de: after(1), ate: T })).toBe(false);
  });

  it('deve aceitar quando só um dos dois foi informado, ou nenhum', () => {
    expect(periodIsOrdered({ de: T })).toBe(true);
    expect(periodIsOrdered({ ate: T })).toBe(true);
    expect(periodIsOrdered({})).toBe(true);
  });
});

describe('filtro de período do histórico', () => {
  const parse = (query: Record<string, string>) => ListAccessEventsSchema.safeParse(query);

  it('deve ler de e ate como instantes, com Z ou com deslocamento de fuso', () => {
    const parsed = parse({ de: '2026-10-20T11:00:00-03:00', ate: '2026-10-20T14:00:00.500Z' });

    expect(parsed.success && parsed.data.de).toEqual(T);
    expect(parsed.success && parsed.data.ate).toEqual(after(500));
  });

  it('deve recusar uma data sem hora, que não é um instante', () => {
    const parsed = parse({ de: '2026-10-20' });

    expect(parsed.success).toBe(false);
    expect(!parsed.success && parsed.error.issues[0]?.path).toEqual(['de']);
  });

  it('deve recusar o ano zero, que o PostgreSQL não tem, também quando o fuso o produz', () => {
    expect(parse({ de: '0000-01-01T00:00:00Z' }).success).toBe(false);
    expect(parse({ ate: '0001-01-01T00:00:00+05:00' }).success).toBe(false);
  });

  it('deve aceitar o primeiro instante do ano 1', () => {
    expect(parse({ de: '0001-01-01T00:00:00Z' }).success).toBe(true);
  });

  it('deve apontar o campo ate quando o período anda para trás', () => {
    const parsed = parse({ de: '2026-10-20T14:00:00.001Z', ate: '2026-10-20T14:00:00.000Z' });

    expect(parsed.success).toBe(false);
    expect(!parsed.success && parsed.error.issues.map((issue) => issue.path)).toEqual([['ate']]);
  });

  it('deve recusar um motivo que não é um código conhecido', () => {
    expect(parse({ motivo: 'INVENTADO' }).success).toBe(false);
    expect(parse({ motivo: 'TERMINAL_OFFLINE' }).success).toBe(true);
  });
});
