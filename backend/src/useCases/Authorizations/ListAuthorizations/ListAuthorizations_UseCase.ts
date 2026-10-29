import type { IClock } from '../../../providers/IClock';
import type { IAuthorizationRepository } from '../../../repositories/IAuthorizationRepository';
import type { Page } from '../../../shared/pagination';
import type { AuthorizationView } from '../authorizationView';
import type { IListAuthorizationsDTO } from './ListAuthorizations_DTO';

export class ListAuthorizationsUseCase {
  constructor(
    private authorizations: IAuthorizationRepository,
    private clock: IClock,
  ) {}

  async execute(_input: IListAuthorizationsDTO): Promise<Page<AuthorizationView>> {
    void this.authorizations;
    void this.clock;
    throw new Error('não implementado');
  }
}
