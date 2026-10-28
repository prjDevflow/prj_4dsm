import type { IClock } from '../../../providers/IClock';
import type { IAuthorizationRepository } from '../../../repositories/IAuthorizationRepository';
import type { AuthorizationView } from '../authorizationView';

export class GetAuthorizationUseCase {
  constructor(
    private authorizations: IAuthorizationRepository,
    private clock: IClock,
  ) {}

  async execute(_id: string): Promise<AuthorizationView> {
    throw new Error('B08: ainda não implementado');
  }
}
