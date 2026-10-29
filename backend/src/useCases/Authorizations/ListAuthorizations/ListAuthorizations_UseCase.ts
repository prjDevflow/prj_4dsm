import type { IClock } from '../../../providers/IClock';
import type { IAuthorizationRepository } from '../../../repositories/IAuthorizationRepository';
import type { Page } from '../../../shared/pagination';
import { toAuthorizationView, type AuthorizationView } from '../authorizationView';
import type { IListAuthorizationsDTO } from './ListAuthorizations_DTO';

export class ListAuthorizationsUseCase {
  constructor(
    private authorizations: IAuthorizationRepository,
    private clock: IClock,
  ) {}

  async execute(input: IListAuthorizationsDTO): Promise<Page<AuthorizationView>> {
    const now = this.clock.now();
    const { items, total } = await this.authorizations.list({ ...input, now, sort: 'recent' });
    return {
      data: items.map((details) => toAuthorizationView(details, now)),
      page: input.page,
      pageSize: input.pageSize,
      total,
    };
  }
}
