import { Authorization } from '../../../entities/Authorization';
import type { IClock } from '../../../providers/IClock';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { ILocationUnitOfWork } from '../../../repositories/ILocationUnitOfWork';
import { toAuthorizationView, type AuthorizationView } from '../authorizationView';
import type { ICreateAuthorizationDTO } from './CreateAuthorization_DTO';

export class CreateAuthorizationUseCase {
  constructor(
    private uow: ILocationUnitOfWork,
    private ids: IIdGenerator,
    private clock: IClock,
  ) {}

  async execute(input: ICreateAuthorizationDTO, adminId: string): Promise<AuthorizationView> {
    const now = this.clock.now();
    return this.uow.run(async ({ authorizations }) => {
      const authorization = Authorization.create({
        id: this.ids.next(),
        ...input,
        criadoPorId: adminId,
        criadoEm: now,
      });
      await authorizations.save(authorization);
      const details = await authorizations.findViewById(authorization.id);
      if (!details) throw new Error('Autorização não encontrada logo após ser gravada');
      return toAuthorizationView(details, now);
    });
  }
}
