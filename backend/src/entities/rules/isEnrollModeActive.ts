import type { Terminal } from '../Terminal';

/**
 * Whether the terminal is waiting to link the next tag read to a user. The deadline itself still
 * counts (like the QR code and the commands); one millisecond later the mode is over, with no job to
 * clear it: the clock decides.
 */
export function isEnrollModeActive(
  terminal: Pick<Terminal, 'modoCadastroUsuarioId' | 'modoCadastroAte'>,
  now: Date,
): boolean {
  if (!terminal.modoCadastroUsuarioId || !terminal.modoCadastroAte) return false;
  return now.getTime() <= terminal.modoCadastroAte.getTime();
}
