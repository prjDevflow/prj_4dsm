import { connectionMessage, detailsToFields, SAVE_FAILED } from '@/lib/apiMessages';
import type { ApiError } from '@/service/ApiError';

// Texts of the tag screens (07-steps, F13). The API code never reaches the screen.

export const INVALID_UID = 'Código inválido. Use de 8 a 20 letras e números.';
export const DUPLICATED_UID = 'Esta tag já está vinculada a alguém.';
export const CHOOSE_PERSON = 'Escolha a pessoa.';
export const CHOOSE_PERSON_FIRST = 'Escolha a pessoa antes de ler a tag no terminal.';
export const UNKNOWN_PERSON = 'Pessoa não encontrada';

export type TagFormField = 'usuarioId' | 'uid' | 'descricao';

const formFields: readonly TagFormField[] = ['usuarioId', 'uid', 'descricao'];

export type TagSaveError = {
  fields: Partial<Record<TagFormField, string>>;
  banner: string | null;
};

/** Where each error of POST /nfc-tags appears: on a field or in the strip. */
export const tagSaveError = (error: ApiError): TagSaveError => {
  const banner = (message: string): TagSaveError => ({ fields: {}, banner: message });

  if (error.code === 'TAG_JA_CADASTRADA') return { fields: { uid: DUPLICATED_UID }, banner: null };
  if (error.status === 422) {
    const { fields, allOnFields } = detailsToFields(error, formFields);
    // The server's own words for the UID are replaced by the rule the person can follow.
    if (fields.uid) fields.uid = INVALID_UID;
    return { fields, banner: allOnFields ? null : 'Confira os dados e tente de novo.' };
  }
  if (error.status === 404) return banner('Esta pessoa não existe mais. Escolha outra.');
  if (error.status === 403) return banner('Você não tem permissão para gerenciar tags.');
  return banner(connectionMessage(error) ?? SAVE_FAILED);
};

/** The enroll mode of the terminal (T30). */
export const enrollErrorMessage = (error: ApiError) => {
  if (error.status === 422)
    return 'Esta pessoa está inativa. Ative o cadastro antes de vincular uma tag.';
  if (error.status === 404) return 'Terminal ou pessoa não encontrados. Volte e escolha de novo.';
  return connectionMessage(error) ?? 'Não foi possível falar com o terminal agora. Tente de novo.';
};

export const toggleErrorMessage = (error: ApiError) =>
  connectionMessage(error) ?? 'Não foi possível mudar a tag agora. Tente de novo.';
