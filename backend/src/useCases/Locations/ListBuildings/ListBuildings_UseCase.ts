import type { Building } from '../../../entities/Building';
import type { IBuildingRepository } from '../../../repositories/IBuildingRepository';
import type { Page } from '../../../shared/pagination';
import type { IListBuildingsDTO } from './ListBuildings_DTO';

export class ListBuildingsUseCase {
  constructor(private buildings: IBuildingRepository) {}

  async execute(input: IListBuildingsDTO): Promise<Page<Building>> {
    const { items, total } = await this.buildings.list(input);
    return { data: items, page: input.page, pageSize: input.pageSize, total };
  }
}
