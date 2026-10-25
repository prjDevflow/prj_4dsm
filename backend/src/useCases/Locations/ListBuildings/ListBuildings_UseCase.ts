import type { Building } from '../../../entities/Building';
import type { IBuildingRepository } from '../../../repositories/IBuildingRepository';
import type { Page } from '../../../shared/pagination';
import type { IListBuildingsDTO } from './ListBuildings_DTO';

export class ListBuildingsUseCase {
  constructor(private buildings: IBuildingRepository) {}

  async execute(_input: IListBuildingsDTO): Promise<Page<Building>> {
    throw new Error('not implemented');
  }
}
