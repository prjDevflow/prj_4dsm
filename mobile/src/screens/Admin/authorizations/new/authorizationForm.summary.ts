import { formatIsoDate } from '@/lib/dateValue';
import type { CreateAuthorizationBody } from '@/lib/types/authorizations';

/** 1000 → "1.000" (Portuguese thousands separator, without depending on Intl). */
const thousands = (value: number) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

type SummaryNames = { pessoa: string; local: string; edificio: string };

/**
 * The card "Resumo" of T24, built from the same body that goes to the API. "em" and the building
 * in parentheses avoid guessing "na" or "no" from the name of the place.
 */
export const buildSummary = (body: CreateAuthorizationBody, names: SummaryNames) => {
  const { dataInicio, dataFim, horaInicio, horaFim, usosPermitidos } = body;
  const period =
    dataInicio === dataFim
      ? `no dia ${formatIsoDate(dataInicio)}`
      : `de ${formatIsoDate(dataInicio)} a ${formatIsoDate(dataFim)}`;
  const times = usosPermitidos === 1 ? '1 vez' : `${thousands(usosPermitidos)} vezes`;

  return `${names.pessoa} poderá entrar em ${names.local} (${names.edificio}) ${period}, das ${horaInicio} às ${horaFim}, até ${times}.`;
};
