import { describe, expect, it } from 'vitest';
import { isEnrollModeActive } from './isEnrollModeActive';

const USER_ID = '00000000-0000-4000-8000-0000000000e1';
const start = new Date('2026-11-06T12:00:00Z');
const after = (s: number) => new Date(start.getTime() + s * 1000);
const mode = { modoCadastroUsuarioId: USER_ID, modoCadastroAte: after(60) };

describe('isEnrollModeActive', () => {
  it('deve ser falso quando o terminal não tem modo de cadastro', () => {
    const none = { modoCadastroUsuarioId: null, modoCadastroAte: null };

    expect(isEnrollModeActive(none, start)).toBe(false);
  });

  it('deve ser verdadeiro em T+60 s, com o limite incluído', () => {
    expect(isEnrollModeActive(mode, start)).toBe(true);
    expect(isEnrollModeActive(mode, after(60))).toBe(true);
  });

  it('deve ser falso em T+61 s', () => {
    expect(isEnrollModeActive(mode, after(61))).toBe(false);
  });
});
