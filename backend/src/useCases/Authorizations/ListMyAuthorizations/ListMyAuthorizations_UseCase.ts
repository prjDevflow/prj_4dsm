import type { IClock } from '../../../providers/IClock';
import type { IAuthorizationRepository } from '../../../repositories/IAuthorizationRepository';
import type { Page } from '../../../shared/pagination';
import { toAuthorizationView, type AuthorizationView } from '../authorizationView';
import type { IListMyAuthorizationsDTO } from './ListMyAuthorizations_DTO';

export class ListMyAuthorizationsUseCase {
  constructor(
    private authorizations: IAuthorizationRepository,
    private clock: IClock,
  ) {}

  async execute(userId: string, input: IListMyAuthorizationsDTO): Promise<Page<AuthorizationView>> {
    const now = this.clock.now();
    const { items, total } = await this.authorizations.list({
      ...input,
      usuarioId: userId,
      now,
      sort: 'dataFim',
    });
    return {
      data: items.map((details) => toAuthorizationView(details, now)),
      page: input.page,
      pageSize: input.pageSize,
      total,
    };
  }
}
