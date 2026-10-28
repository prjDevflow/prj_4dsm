import type { IClock } from '../../../providers/IClock';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { ILocationUnitOfWork } from '../../../repositories/ILocationUnitOfWork';
import type { AuthorizationView } from '../authorizationView';
import type { ICreateAuthorizationDTO } from './CreateAuthorization_DTO';

export class CreateAuthorizationUseCase {
  constructor(
    private uow: ILocationUnitOfWork,
    private ids: IIdGenerator,
    private clock: IClock,
  ) {}

  async execute(_input: ICreateAuthorizationDTO, _adminId: string): Promise<AuthorizationView> {
    throw new Error('B08: ainda não implementado');
  }
}
