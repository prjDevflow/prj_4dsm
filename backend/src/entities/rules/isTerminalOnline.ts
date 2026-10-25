/** Online means the last contact is less than `windowSeconds` old; a terminal never heard from is offline. */
export function isTerminalOnline(
  ultimoContatoEm: Date | null,
  now: Date,
  windowSeconds: number,
): boolean {
  if (!ultimoContatoEm) return false;
  return now.getTime() - ultimoContatoEm.getTime() < windowSeconds * 1000;
}
