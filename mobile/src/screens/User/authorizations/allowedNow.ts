import { inSaoPaulo } from '@/lib/dateValue';
import type { Autorizacao } from '@/lib/types/authorizations';

type Window = Pick<Autorizacao, 'dataInicio' | 'dataFim' | 'horaInicio' | 'horaFim'>;

/**
 * Whether the period and the hours include this moment, ends included, like the API. It only feeds
 * the warning on the card: who decides at the turnstile is always the server.
 */
export const isAllowedNow = ({ dataInicio, dataFim, horaInicio, horaFim }: Window, now: Date) => {
  const { date, time } = inSaoPaulo(now);
  return date >= dataInicio && date <= dataFim && time >= horaInicio && time <= horaFim;
};
