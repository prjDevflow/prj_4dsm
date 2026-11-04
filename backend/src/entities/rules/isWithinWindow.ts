import type { Authorization } from '../Authorization';

type WindowInput = Pick<Authorization, 'dataInicio' | 'dataFim' | 'horaInicio' | 'horaFim'>;

/**
 * Whether `now` falls inside the authorization's dates and times, both in America/Sao_Paulo and with
 * the ends included. It looks only at the window: status and uses are other rules.
 */
export function isWithinWindow(_authorization: WindowInput, _now: Date): boolean {
  throw new Error('não implementado');
}
