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
    const details = await this.authorizations.findViewById(id);
    if (!details) throw new NotFoundError('Autorização não encontrada');
    await this.authorizations.cancelIfActive({
      id,
      canceladoPorId: adminId,
      canceladoEm: this.clock.now(),
      motivo: input.motivo ?? null,
    });
    return toAuthorizationView(details, this.clock.now());
  }
}
