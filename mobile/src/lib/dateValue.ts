// Values of the date and time fields. The contract uses "YYYY-MM-DD" and "HH:mm" (no time zone);
// the native picker works with Date in the phone's local time, so conversions use local getters.
const pad = (value: number) => String(value).padStart(2, '0');

/** "2026-10-20" → "20/10/2026" */
export const formatIsoDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

/** Date picked in the picker → "YYYY-MM-DD" */
export const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** "YYYY-MM-DD" → Date at local midnight, to open the picker on that day */
export const fromIsoDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/** Date picked in the picker → "HH:mm" */
export const toTime = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** "HH:mm" → today at that time, to open the picker */
export const fromTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

/** "20/10 a 25/10" in lists: the year only adds noise, unless the period crosses it. */
export const formatPeriod = (start: string, end: string) => {
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  const format = (date: string) =>
    sameYear ? formatIsoDate(date).slice(0, 5) : formatIsoDate(date);
  return `${format(start)} a ${format(end)}`;
};

const saoPaulo = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * The day and the time in São Paulo, whatever the phone's time zone is. Read from the formatted
 * text because formatToParts is not dependable on Hermes for iOS; some engines write midnight as 24.
 */
export const inSaoPaulo = (instant: Date) => {
  const [day, month, year, hour, minute] = saoPaulo.format(instant).match(/\d+/g) ?? [];
  return { date: `${year}-${month}-${day}`, time: `${pad(Number(hour) % 24)}:${minute}` };
};

/** Instant of the API (UTC) → "19/10/2026 às 09:05", in São Paulo. */
export const formatDateTime = (instant: string) => {
  const { date, time } = inSaoPaulo(new Date(instant));
  return `${formatIsoDate(date)} às ${time}`;
};
