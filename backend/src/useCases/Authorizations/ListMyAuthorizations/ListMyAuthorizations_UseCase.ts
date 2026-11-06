import type { IClock } from '../../../providers/IClock';
import type { IAuthorizationRepository } from '../../../repositories/IAuthorizationRepository';
import type { Page } from '../../../shared/pagination';
import { toAuthorizationPage, type AuthorizationView } from '../authorizationView';
import type { IListMyAuthorizationsDTO } from './ListMyAuthorizations_DTO';

export class ListMyAuthorizationsUseCase {
  constructor(
    private authorizations: IAuthorizationRepository,
    private clock: IClock,
  ) {}

  async execute(userId: string, input: IListMyAuthorizationsDTO): Promise<Page<AuthorizationView>> {
    const now = this.clock.now();
    const result = await this.authorizations.list({
      ...input,
      usuarioId: userId,
      now,
      sort: 'dataFim',
    });
    return toAuthorizationPage(result, input, now);
  }
}
