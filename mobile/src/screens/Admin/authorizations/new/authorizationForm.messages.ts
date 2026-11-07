import { connectionMessage, detailsToFields, SAVE_FAILED } from '@/lib/apiMessages';
import type { ApiError } from '@/service/ApiError';

// Texts of the new authorization (06-steps, F07). The API code never reaches the screen.

const formFields = [
  'usuarioId',
  'accessPointId',
  'dataInicio',
  'dataFim',
  'horaInicio',
  'horaFim',
  'usosPermitidos',
] as const;

export type AuthorizationFormField = (typeof formFields)[number];

export type AuthorizationSaveError = {
  fields: Partial<Record<AuthorizationFormField, string>>;
  banner: string | null;
};

export const authorizationSaveError = (error: ApiError): AuthorizationSaveError => {
  if (error.status === 404) {
    return { fields: {}, banner: 'A pessoa ou o local não existe mais. Atualize a tela.' };
  }
  if (error.status === 422) {
    const { fields, allOnFields } = detailsToFields(error, formFields);
    return { fields, banner: allOnFields ? null : 'Confira os dados e tente de novo.' };
  }
  return { fields: {}, banner: connectionMessage(error) ?? SAVE_FAILED };
};
