import type { Terminal } from '../Terminal';

/**
 * Whether the next tag read on the terminal is linked instead of checked. Nothing clears the columns
 * when the time runs out: the mode ends because the clock passed `modoCadastroAte` (limit included).
 */
export function isEnrollModeActive(
  terminal: Pick<Terminal, 'modoCadastroUsuarioId' | 'modoCadastroAte'>,
  now: Date,
): boolean {
  if (!terminal.modoCadastroUsuarioId || !terminal.modoCadastroAte) return false;
  return now.getTime() <= terminal.modoCadastroAte.getTime();
}
