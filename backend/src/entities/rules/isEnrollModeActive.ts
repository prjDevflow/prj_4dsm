import type { Terminal } from '../Terminal';

export function isEnrollModeActive(
  _terminal: Pick<Terminal, 'modoCadastroUsuarioId' | 'modoCadastroAte'>,
  _now: Date,
): boolean {
  return false;
}
