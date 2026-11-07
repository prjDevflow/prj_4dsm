const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Last contact of a terminal as the Figma writes it (T20): "Visto há 12 min". */
export const seenAgo = (lastContact: string | null, now: Date): string => {
  if (!lastContact) return 'Nunca conectado';
  const elapsed = Math.max(0, now.getTime() - new Date(lastContact).getTime());

  if (elapsed < MINUTE) return 'Visto agora';
  if (elapsed < HOUR) return `Visto há ${Math.floor(elapsed / MINUTE)} min`;
  if (elapsed < DAY) return `Visto há ${Math.floor(elapsed / HOUR)} h`;
  const days = Math.floor(elapsed / DAY);
  return `Visto há ${days} ${days === 1 ? 'dia' : 'dias'}`;
};
