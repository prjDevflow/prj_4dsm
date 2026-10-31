import type { Building } from '../../../entities/Building';
import { todayInSaoPaulo } from '../../../entities/rules/todayInSaoPaulo';
import type { IClock } from '../../../providers/IClock';
import type { ILocationUnitOfWork } from '../../../repositories/ILocationUnitOfWork';
import { NotFoundError } from '../../../shared/errors/AppError';
import { LocalWithActiveAuthorizationsError } from '../locationErrors';
import type { IUpdateBuildingDTO } from './UpdateBuilding_DTO';

export class UpdateBuildingUseCase {
  constructor(
    private uow: ILocationUnitOfWork,
    private clock: IClock,
  ) {}

  async execute(id: string, input: IUpdateBuildingDTO): Promise<Building> {
    return this.uow.run(async ({ buildings, accessPoints, authorizations }) => {
      // The lock lasts until the end of the transaction: nobody changes the building, or puts a point
      // in it, while this request decides.
      const building = await buildings.findByIdForUpdate(id);
      if (!building) throw new NotFoundError('Edifício não encontrado');

      const updated: Building = {
        ...building,
        nome: input.nome ?? building.nome,
        endereco: input.endereco ?? building.endereco,
        latitude: input.latitude ?? building.latitude,
        longitude: input.longitude ?? building.longitude,
        ativo: input.ativo ?? building.ativo,
      };

      if (building.ativo && !updated.ativo) {
        // Locking the points makes an authorization being created for one of them finish first, so the
        // check below sees it.
        await accessPoints.lockByBuilding(id);
        const today = todayInSaoPaulo(this.clock.now());
        if (await authorizations.hasActiveNonExpiredForBuilding(id, today)) {
          throw new LocalWithActiveAuthorizationsError();
        }
        // An inactive building must not keep working access points (B08 and B15 only look at the point).
        await accessPoints.deactivateByBuilding(id);
      }

      await buildings.save(updated);
      return updated;
    });
  }
}
