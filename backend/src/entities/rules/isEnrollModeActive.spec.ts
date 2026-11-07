import { describe, expect, it } from 'vitest';
import { isEnrollModeActive } from './isEnrollModeActive';

const USER_ID = '00000000-0000-4000-8000-0000000000b1';
const until = new Date('2026-10-20T14:01:00Z');
const at = (secondsAfterUntil: number) => new Date(until.getTime() + secondsAfterUntil * 1000);
const enrolling = { modoCadastroUsuarioId: USER_ID, modoCadastroAte: until };

describe('isEnrollModeActive', () => {
  it('deve estar vigente antes do prazo', () => {
    expect(isEnrollModeActive(enrolling, at(-1))).toBe(true);
    expect(isEnrollModeActive(enrolling, at(-59))).toBe(true);
  });

  it('deve estar vigente no instante exato do prazo (a ponta é inclusiva, como no QR e nos comandos)', () => {
    expect(isEnrollModeActive(enrolling, at(0))).toBe(true);
  });

  it('deve estar vencido 1 ms depois do prazo', () => {
    const justAfter = new Date(until.getTime() + 1);
    expect(isEnrollModeActive(enrolling, justAfter)).toBe(false);
  });

  it('deve estar vencido 1 s e 61 s depois do prazo', () => {
    expect(isEnrollModeActive(enrolling, at(1))).toBe(false);
    expect(isEnrollModeActive(enrolling, at(61))).toBe(false);
  });

  it('deve não estar vigente quando o terminal nunca entrou em modo de cadastro', () => {
    expect(
      isEnrollModeActive({ modoCadastroUsuarioId: null, modoCadastroAte: null }, at(-10)),
    ).toBe(false);
  });

  it('deve não estar vigente quando falta o usuário ou falta o prazo', () => {
    expect(
      isEnrollModeActive({ modoCadastroUsuarioId: null, modoCadastroAte: until }, at(-10)),
    ).toBe(false);
    expect(
      isEnrollModeActive({ modoCadastroUsuarioId: USER_ID, modoCadastroAte: null }, at(-10)),
    ).toBe(false);
  });
});
