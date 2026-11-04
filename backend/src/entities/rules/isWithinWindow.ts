import type { Authorization } from '../Authorization';
import { timeInSaoPaulo } from './timeInSaoPaulo';
import { todayInSaoPaulo } from './todayInSaoPaulo';

type WindowInput = Pick<Authorization, 'dataInicio' | 'dataFim' | 'horaInicio' | 'horaFim'>;

/**
 * Whether `now` falls inside the authorization's dates and times, both in America/Sao_Paulo and with
 * the ends included. It looks only at the window: status and uses are other rules. The time is
 * compared as HH:mm, so the whole minute of `horaFim` still counts.
 */
export function isWithinWindow(authorization: WindowInput, now: Date): boolean {
  // YYYY-MM-DD and zero-padded HH:mm compare as text.
  const today = todayInSaoPaulo(now);
  const time = timeInSaoPaulo(now);
  return (
    today >= authorization.dataInicio &&
    today <= authorization.dataFim &&
    time >= authorization.horaInicio &&
    time <= authorization.horaFim
  );
}
