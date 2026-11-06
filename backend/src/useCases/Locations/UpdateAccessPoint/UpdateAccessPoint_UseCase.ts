import type { AccessPoint } from '../../../entities/AccessPoint';
import { todayInSaoPaulo } from '../../../entities/rules/todayInSaoPaulo';
import type { IClock } from '../../../providers/IClock';
import type { ILocationUnitOfWork } from '../../../repositories/ILocationUnitOfWork';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { LocalWithActiveAuthorizationsError } from '../locationErrors';
import type { IUpdateAccessPointDTO } from './UpdateAccessPoint_DTO';

export class UpdateAccessPointUseCase {
  constructor(
    private uow: ILocationUnitOfWork,
    private clock: IClock,
  ) {}

  async execute(id: string, input: IUpdateAccessPointDTO): Promise<AccessPoint> {
    return this.uow.run(async ({ buildings, accessPoints, authorizations }) => {
      // Lock order is always building, then point (as in UpdateBuilding), so two requests never wait
      // for each other. `buildingId` never changes, so reading it before the lock is safe.
      const known = await accessPoints.findById(id);
      if (!known) throw new NotFoundError('Ponto de acesso não encontrado');
      // The share lock keeps the building from being deactivated while the point is reactivated.
      const building =
        input.ativo === true ? await buildings.findByIdForShare(known.buildingId) : null;

      const accessPoint = await accessPoints.findByIdForUpdate(id);
      if (!accessPoint) throw new NotFoundError('Ponto de acesso não encontrado');

      const updated: AccessPoint = {
        ...accessPoint,
        tipo: input.tipo ?? accessPoint.tipo,
        nome: input.nome ?? accessPoint.nome,
        identificacao: input.identificacao ?? accessPoint.identificacao,
        latitude: input.latitude ?? accessPoint.latitude,
        longitude: input.longitude ?? accessPoint.longitude,
        ativo: input.ativo ?? accessPoint.ativo,
      };

      if (accessPoint.ativo && !updated.ativo) {
        // The point is locked, so an authorization being created for it finishes first and is seen here.
        const today = todayInSaoPaulo(this.clock.now());
        if (await authorizations.hasActiveNonExpiredForAccessPoint(id, today)) {
          throw new LocalWithActiveAuthorizationsError();
        }
      }
      if (!accessPoint.ativo && updated.ativo && !building?.ativo) {
        // A point does not come back to life inside a building that was shut down.
        throw new ValidationError('Dados inválidos', [
          { field: 'ativo', message: 'O edifício está inativo; reative-o antes' },
        ]);
      }

      // `save` rejects a repeated identification in the building (409), even between simultaneous requests.
      await accessPoints.save(updated);
      return updated;
    });
  }
}
