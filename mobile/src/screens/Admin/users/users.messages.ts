import { connectionMessage, detailsToFields, SAVE_FAILED } from '@/lib/apiMessages';
import type { CreateUserBody, UpdateUserBody } from '@/lib/types/users';
import type { ApiError } from '@/service/ApiError';

// Texts of the user screens (06-steps, F05). The API code never reaches the screen.

export { loadErrorMessage } from '@/lib/apiMessages';

export type UserFormField = 'nome' | 'email' | 'perfil' | 'senha';

const formFields: readonly UserFormField[] = ['nome', 'email', 'perfil', 'senha'];

export type SaveError = {
  /** Errors shown under each field. */
  fields: Partial<Record<UserFormField, string>>;
  /** Error shown in the strip above the buttons. */
  banner: string | null;
};

const selfChangeMessage = (sent: Partial<UpdateUserBody>) => {
  const deactivates = sent.ativo === false;
  const changesProfile = sent.perfil !== undefined;
  if (deactivates && changesProfile) {
    return 'Você não pode desativar a si mesmo nem alterar o seu próprio perfil.';
  }
  return changesProfile
    ? 'Você não pode alterar o seu próprio perfil.'
    : 'Você não pode desativar a si mesmo.';
};

/** Where each error of POST or PATCH /users appears: on a field or in the strip. */
export const saveError = (
  error: ApiError,
  sent: Partial<CreateUserBody> | UpdateUserBody,
): SaveError => {
  const banner = (message: string): SaveError => ({ fields: {}, banner: message });

  switch (error.code) {
    case 'EMAIL_JA_CADASTRADO':
      return { fields: { email: 'Este e-mail já está cadastrado.' }, banner: null };
    case 'AUTO_DESATIVACAO':
      return banner(selfChangeMessage(sent as UpdateUserBody));
    case 'ULTIMO_ADMIN':
      return banner('O sistema precisa de pelo menos um administrador ativo.');
  }

  if (error.status === 422) {
    const { fields, allOnFields } = detailsToFields(error, formFields);
    // A detail about something the screen has no field for still needs to be seen.
    return { fields, banner: allOnFields ? null : 'Confira os dados e tente de novo.' };
  }
  if (error.status === 403) return banner('Você não tem permissão para gerenciar usuários.');
  if (error.status === 404) return banner('Este usuário não existe mais. Volte para a lista.');

  return banner(connectionMessage(error) ?? SAVE_FAILED);
};
