import type { Authorization } from '../Authorization';
import type { User } from '../User';
import { isWithinWindow } from './isWithinWindow';

/** The denials the evaluator decides (checks 6 to 9 of doc 03, section 5.1). */
export type EvaluationDenialReason =
  'SEM_AUTORIZACAO' | 'AUTORIZACAO_CANCELADA' | 'FORA_DO_PERIODO' | 'USOS_ESGOTADOS';

export type AccessEvaluation =
  | { granted: true; authorization: Authorization }
  | { granted: false; reason: EvaluationDenialReason };

export interface EvaluateInput {
  user: Pick<User, 'id'>;
  accessPointId: string;
  /** Authorizations of the user, cancelled ones included. Others are ignored. */
  authorizations: Authorization[];
  now: Date;
}

const denied = (reason: EvaluationDenialReason): AccessEvaluation => ({ granted: false, reason });

/** Ends first; the id breaks ties so the choice does not depend on the order of the list. */
const byEarliestEnd = (a: Authorization, b: Authorization) =>
  a.dataFim.localeCompare(b.dataFim) || a.id.localeCompare(b.id);

export const AccessEvaluator = {
  /**
   * Checks 6 to 9 as a funnel: each check narrows the set left by the previous one, and the first
   * that leaves nothing gives the reason. Shared by the QR and the NFC flows.
   */
  evaluate({ user, accessPointId, authorizations, now }: EvaluateInput): AccessEvaluation {
    const ofUser = authorizations.filter(
      (a) => a.usuarioId === user.id && a.accessPointId === accessPointId,
    );
    if (ofUser.length === 0) return denied('SEM_AUTORIZACAO');

    const notCancelled = ofUser.filter((a) => a.situacao !== 'CANCELADA');
    if (notCancelled.length === 0) return denied('AUTORIZACAO_CANCELADA');

    const inWindow = notCancelled.filter((a) => isWithinWindow(a, now));
    if (inWindow.length === 0) return denied('FORA_DO_PERIODO');

    const withUses = inWindow.filter((a) => a.usosRealizados < a.usosPermitidos);
    if (withUses.length === 0) return denied('USOS_ESGOTADOS');

    const chosen = withUses.reduce((best, a) => (byEarliestEnd(a, best) < 0 ? a : best));
    return { granted: true, authorization: chosen };
  },
};
