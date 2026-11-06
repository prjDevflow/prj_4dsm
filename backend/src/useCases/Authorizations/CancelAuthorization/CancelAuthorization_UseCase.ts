import type { IClock } from '../../../providers/IClock';
import type { IAuthorizationRepository } from '../../../repositories/IAuthorizationRepository';
import { NotFoundError } from '../../../shared/errors/AppError';
import { toAuthorizationView, type AuthorizationView } from '../authorizationView';
import type { ICancelAuthorizationDTO } from './CancelAuthorization_DTO';

export class CancelAuthorizationUseCase {
  constructor(
    private authorizations: IAuthorizationRepository,
    private clock: IClock,
  ) {}

  async execute(
    id: string,
    input: ICancelAuthorizationDTO,
    adminId: string,
  ): Promise<AuthorizationView> {
    // Does nothing when it is already cancelled (or missing): the answer is the stored state.
    const now = this.clock.now();
    await this.authorizations.cancelIfActive({
      id,
      canceladoPorId: adminId,
      canceladoEm: now,
      motivo: input.motivo ?? null,
    });
    const updated = await this.authorizations.findViewById(id);
    if (!updated) throw new NotFoundError('Autorização não encontrada');
    return toAuthorizationView(updated, now);
  }
}
