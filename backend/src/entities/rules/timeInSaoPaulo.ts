// `hourCycle: 'h23'` keeps midnight as 00 (the default 12/24 mix can print 24).
const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** The wall-clock time (HH:mm, 24 h) of an instant in America/Sao_Paulo. Seconds are dropped. */
export function timeInSaoPaulo(now: Date): string {
  const parts = Object.fromEntries(formatter.formatToParts(now).map((p) => [p.type, p.value]));
  return `${parts.hour}:${parts.minute}`;
}
