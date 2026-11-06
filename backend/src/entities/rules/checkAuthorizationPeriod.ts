import type { Authorization } from '../Authorization';

export interface PeriodProblem {
  field: 'dataFim' | 'horaFim';
  message: string;
}

type PeriodInput = Pick<Authorization, 'dataInicio' | 'dataFim' | 'horaInicio' | 'horaFim'>;

/**
 * The rules of the dates and times of a new authorization, one problem per field at most.
 * `today` is YYYY-MM-DD in America/Sao_Paulo. The start date may be in the past; the end date may not.
 * The times do not wrap past midnight. YYYY-MM-DD and zero-padded HH:mm compare as text.
 */
export function checkAuthorizationPeriod(input: PeriodInput, today: string): PeriodProblem[] {
  const problems: PeriodProblem[] = [];
  if (input.dataFim < input.dataInicio) {
    problems.push({ field: 'dataFim', message: 'Deve ser igual ou posterior à data de início' });
  } else if (input.dataFim < today) {
    problems.push({ field: 'dataFim', message: 'Não pode estar no passado' });
  }
  if (input.horaFim <= input.horaInicio) {
    problems.push({ field: 'horaFim', message: 'Deve ser depois da hora de início' });
  }
  return problems;
}
