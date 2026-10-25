import type { Building } from '../../../entities/Building';
import { todayInSaoPaulo } from '../../../entities/rules/todayInSaoPaulo';
import type { IClock } from '../../../providers/IClock';
import type { IAuthorizationRepository } from '../../../repositories/IAuthorizationRepository';
import type { IBuildingRepository } from '../../../repositories/IBuildingRepository';
import { NotFoundError } from '../../../shared/errors/AppError';
import { LocalWithActiveAuthorizationsError } from '../locationErrors';
import type { IUpdateBuildingDTO } from './UpdateBuilding_DTO';

export class UpdateBuildingUseCase {
  constructor(
    private buildings: IBuildingRepository,
    private authorizations: IAuthorizationRepository,
    private clock: IClock,
  ) {}

  async execute(id: string, input: IUpdateBuildingDTO): Promise<Building> {
    const building = await this.buildings.findById(id);
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
      const today = todayInSaoPaulo(this.clock.now());
      if (await this.authorizations.hasActiveNonExpiredForBuilding(id, today)) {
        throw new LocalWithActiveAuthorizationsError();
      }
      // An inactive building must not keep working access points (B08 and B15 only look at the point).
      await this.buildings.saveAndDeactivateAccessPoints(updated);
    } else {
      await this.buildings.save(updated);
    }
    return updated;
  }
}
