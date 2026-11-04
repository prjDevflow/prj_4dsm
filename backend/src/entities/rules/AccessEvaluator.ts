import type { Authorization } from '../Authorization';
import type { User } from '../User';

/** The denials the evaluator decides (checks 6 to 9 of doc 03, section 5.1). */
export type EvaluationDenialReason =
  | 'SEM_AUTORIZACAO'
  | 'AUTORIZACAO_CANCELADA'
  | 'FORA_DO_PERIODO'
  | 'USOS_ESGOTADOS';

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

export const AccessEvaluator = {
  evaluate(_input: EvaluateInput): AccessEvaluation {
    throw new Error('não implementado');
  },
};
