import { ConflictError } from '../../shared/errors/AppError';

/** Deactivating a place (or the building around it) while people still hold valid permissions for it. */
export class LocalWithActiveAuthorizationsError extends ConflictError {
  constructor() {
    super(
      'LOCAL_COM_AUTORIZACOES_ATIVAS',
      'Este local ainda tem autorizações ativas. Cancele-as antes.',
    );
  }
}
