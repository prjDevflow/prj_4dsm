import type { Building } from '../../../entities/Building';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { IBuildingRepository } from '../../../repositories/IBuildingRepository';
import type { ICreateBuildingDTO } from './CreateBuilding_DTO';

export class CreateBuildingUseCase {
  constructor(
    private buildings: IBuildingRepository,
    private ids: IIdGenerator,
  ) {}

  async execute(_input: ICreateBuildingDTO): Promise<Building> {
    throw new Error('not implemented');
  }
}
