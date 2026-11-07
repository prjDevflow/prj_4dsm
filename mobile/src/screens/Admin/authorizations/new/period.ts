import { toIsoDate } from '@/lib/dateValue';

// Shortcuts above the dates of T24. They use the phone's day (the condominium's time zone).

export const onlyToday = (now: Date) => {
  const today = toIsoDate(now);
  return { dataInicio: today, dataFim: today };
};

/** Today and the six days after it: seven days counting today. */
export const nextSevenDays = (now: Date) => {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6);
  return { dataInicio: toIsoDate(now), dataFim: toIsoDate(end) };
};
