import type { ApiError } from '@/service/ApiError';

// Texts shared by every screen that loads or saves. The API code never reaches the screen.

const NO_CONNECTION = 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
const TIMEOUT = 'O servidor demorou para responder. Tente de novo.';

export const SAVE_FAILED = 'Não foi possível salvar agora. Tente novamente em instantes.';

/** No network or timeout; null for the other errors. */
export const connectionMessage = (error: ApiError) =>
  error.code === 'NETWORK' ? NO_CONNECTION : error.code === 'TIMEOUT' ? TIMEOUT : null;

/** Message under the title of the error state, when a list or a record does not load. */
export const loadErrorMessage = (error: ApiError) =>
  connectionMessage(error) ?? 'Tente novamente em instantes.';

/** "deve ter no mínimo 3 caracteres" → "Deve ter no mínimo 3 caracteres." */
export const sentence = (text: string) => {
  const trimmed = text.trim();
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
};

/**
 * The `details` of a 422 on the form fields. `allOnFields` is false when some detail is about
 * something the screen has no field for: that one still needs to be shown.
 */
export const detailsToFields = <F extends string>(error: ApiError, fields: readonly F[]) => {
  const known = error.details.filter((detail) =>
    (fields as readonly string[]).includes(detail.field),
  );
  return {
    fields: Object.fromEntries(
      known.map((detail) => [detail.field, sentence(detail.message)]),
    ) as Partial<Record<F, string>>,
    allOnFields: known.length > 0 && known.length === error.details.length,
  };
};
