import type { Building } from '../../../entities/Building';
import type { IClock } from '../../../providers/IClock';
import type { IAuthorizationRepository } from '../../../repositories/IAuthorizationRepository';
import type { IBuildingRepository } from '../../../repositories/IBuildingRepository';
import type { IUpdateBuildingDTO } from './UpdateBuilding_DTO';

export class UpdateBuildingUseCase {
  constructor(
    private buildings: IBuildingRepository,
    private authorizations: IAuthorizationRepository,
    private clock: IClock,
  ) {}

  async execute(_id: string, _input: IUpdateBuildingDTO): Promise<Building> {
    throw new Error('not implemented');
  }
}
