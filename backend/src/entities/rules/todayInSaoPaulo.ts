const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The calendar date (YYYY-MM-DD) of an instant in America/Sao_Paulo. */
export function todayInSaoPaulo(now: Date): string {
  const parts = Object.fromEntries(formatter.formatToParts(now).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
