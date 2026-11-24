import { connectionMessage, detailsToFields, SAVE_FAILED, sentence } from '@/lib/apiMessages';
import type { ApiError } from '@/service/ApiError';

// Texts of the place and terminal screens (06-steps, F06). The API code never reaches the screen.

export const ACTIVE_AUTHORIZATIONS = 'Este local ainda tem autorizações ativas. Cancele-as antes.';

export type LocationForm = 'building' | 'accessPoint' | 'terminal';

const formFields: Record<LocationForm, readonly string[]> = {
  building: ['nome', 'endereco', 'latitude', 'longitude'],
  accessPoint: ['buildingId', 'tipo', 'nome', 'identificacao', 'latitude', 'longitude'],
  terminal: ['nome', 'accessPointId'],
};

// CONFLICT means a different thing on each form (B07).
const conflicts: Partial<Record<LocationForm, { field: string; message: string }>> = {
  accessPoint: {
    field: 'identificacao',
    message: 'Já existe um local com esta identificação neste edifício.',
  },
  terminal: { field: 'accessPointId', message: 'Este ponto de acesso já tem um terminal.' },
};

export type LocationSaveError = {
  fields: Partial<Record<string, string>>;
  banner: string | null;
};

/** Where each error of the POST and PATCH of places and terminals appears. */
export const locationSaveError = (error: ApiError, form: LocationForm): LocationSaveError => {
  const banner = (message: string): LocationSaveError => ({ fields: {}, banner: message });

  if (error.code === 'LOCAL_COM_AUTORIZACOES_ATIVAS') return banner(ACTIVE_AUTHORIZATIONS);

  const conflict = conflicts[form];
  if (error.code === 'CONFLICT' && conflict) {
    return { fields: { [conflict.field]: conflict.message }, banner: null };
  }

  if (error.status === 422) {
    const { fields, allOnFields } = detailsToFields(error, formFields[form]);
    // A detail with no field on the screen ("ativo" when the building is inactive) goes to the strip.
    const other = error.details.find((detail) => !formFields[form].includes(detail.field));
    return {
      fields,
      banner: allOnFields
        ? null
        : other
          ? sentence(other.message)
          : 'Confira os dados e tente de novo.',
    };
  }
  if (error.status === 404) return banner('Este cadastro não existe mais. Volte para a lista.');

  return banner(connectionMessage(error) ?? SAVE_FAILED);
};
