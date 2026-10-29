import type { IClock } from '../../../providers/IClock';
import type { IAuthorizationRepository } from '../../../repositories/IAuthorizationRepository';
import type { Page } from '../../../shared/pagination';
import type { AuthorizationView } from '../authorizationView';
import type { IListMyAuthorizationsDTO } from './ListMyAuthorizations_DTO';

export class ListMyAuthorizationsUseCase {
  constructor(
    private authorizations: IAuthorizationRepository,
    private clock: IClock,
  ) {}

  async execute(
    _userId: string,
    _input: IListMyAuthorizationsDTO,
  ): Promise<Page<AuthorizationView>> {
    void this.authorizations;
    void this.clock;
    throw new Error('não implementado');
  }
}
