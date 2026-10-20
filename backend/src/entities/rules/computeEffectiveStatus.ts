import type { Authorization, EffectiveAuthorizationStatus } from '../Authorization';
import { todayInSaoPaulo } from './todayInSaoPaulo';

type StatusInput = Pick<Authorization, 'situacao' | 'dataFim' | 'usosPermitidos' | 'usosRealizados'>;

/** Priority: CANCELADA, EXPIRADA, ESGOTADA, ATIVA. The last day of the period still counts. */
export function computeEffectiveStatus(
  authorization: StatusInput,
  now: Date,
): EffectiveAuthorizationStatus {
  if (authorization.situacao === 'CANCELADA') return 'CANCELADA';
  // YYYY-MM-DD strings compare in chronological order.
  if (todayInSaoPaulo(now) > authorization.dataFim) return 'EXPIRADA';
  if (authorization.usosRealizados >= authorization.usosPermitidos) return 'ESGOTADA';
  return 'ATIVA';
}
