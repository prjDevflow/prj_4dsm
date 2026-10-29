import type { IClock } from '../../../providers/IClock';
import type { IAuthorizationRepository } from '../../../repositories/IAuthorizationRepository';
import type { AuthorizationView } from '../authorizationView';
import type { ICancelAuthorizationDTO } from './CancelAuthorization_DTO';

export class CancelAuthorizationUseCase {
  constructor(
    private authorizations: IAuthorizationRepository,
    private clock: IClock,
  ) {}

  async execute(
    _id: string,
    _input: ICancelAuthorizationDTO,
    _adminId: string,
  ): Promise<AuthorizationView> {
    void this.authorizations;
    void this.clock;
    throw new Error('não implementado');
  }
}
