import { describe, expect, it } from 'vitest';
import { isTerminalOnline } from './isTerminalOnline';

const now = new Date('2026-10-20T14:00:00Z');
const secondsAgo = (s: number) => new Date(now.getTime() - s * 1000);

describe('isTerminalOnline', () => {
  it('deve ser online com contato há 29 s e offline com contato há 31 s (janela de 30 s)', () => {
    expect(isTerminalOnline(secondsAgo(29), now, 30)).toBe(true);
    expect(isTerminalOnline(secondsAgo(31), now, 30)).toBe(false);
  });

  it('deve ser offline com contato há exatamente a janela (menos de 30 s é online)', () => {
    expect(isTerminalOnline(secondsAgo(30), now, 30)).toBe(false);
  });

  it('deve ser offline quando o terminal nunca fez contato', () => {
    expect(isTerminalOnline(null, now, 30)).toBe(false);
  });

  it('deve respeitar a janela configurada', () => {
    expect(isTerminalOnline(secondsAgo(45), now, 60)).toBe(true);
  });
});
