import type { UserProfile } from '../../../entities/User';
import type { IClock } from '../../../providers/IClock';
import type { IAuthorizationRepository } from '../../../repositories/IAuthorizationRepository';
import { NotFoundError } from '../../../shared/errors/AppError';
import { toAuthorizationView, type AuthorizationView } from '../authorizationView';

export class GetAuthorizationUseCase {
  constructor(
    private authorizations: IAuthorizationRepository,
    private clock: IClock,
  ) {}

  async execute(
    id: string,
    requester: { userId: string; perfil: UserProfile },
  ): Promise<AuthorizationView> {
    const details = await this.authorizations.findViewById(id);
    if (!details) throw new NotFoundError('Autorização não encontrada');
    return toAuthorizationView(details, this.clock.now());
  }
}
