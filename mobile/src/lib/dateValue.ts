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
