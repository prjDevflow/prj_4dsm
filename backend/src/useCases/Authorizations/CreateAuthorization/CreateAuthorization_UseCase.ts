import { Authorization } from '../../../entities/Authorization';
import type { IClock } from '../../../providers/IClock';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { ILocationUnitOfWork } from '../../../repositories/ILocationUnitOfWork';
import {
  NotFoundError,
  ValidationError,
  type ErrorDetails,
} from '../../../shared/errors/AppError';
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
    return this.uow.run(async ({ users, accessPoints, authorizations }) => {
      // The share locks last until the transaction ends: a deactivation of the user or of the
      // point running at the same time waits, or was already committed and is seen right here.
      // Lock order: user, then point.
      const user = await users.findByIdForShare(input.usuarioId);
      if (!user) throw new NotFoundError('Usuário não encontrado');
      const accessPoint = await accessPoints.findByIdForShare(input.accessPointId);
      if (!accessPoint) throw new NotFoundError('Ponto de acesso não encontrado');

      const problems: ErrorDetails = [];
      if (!user.ativo) problems.push({ field: 'usuarioId', message: 'Usuário inativo' });
      if (!accessPoint.ativo) {
        problems.push({ field: 'accessPointId', message: 'Ponto de acesso inativo' });
      }
      if (problems.length > 0) throw new ValidationError('Dados inválidos', problems);

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
