import type { Building } from '../../../entities/Building';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { IBuildingRepository } from '../../../repositories/IBuildingRepository';
import type { ICreateBuildingDTO } from './CreateBuilding_DTO';

export class CreateBuildingUseCase {
  constructor(
    private buildings: IBuildingRepository,
    private ids: IIdGenerator,
  ) {}

  async execute(input: ICreateBuildingDTO): Promise<Building> {
    const building: Building = {
      id: this.ids.next(),
      nome: input.nome,
      endereco: input.endereco,
      latitude: input.latitude,
      longitude: input.longitude,
      ativo: input.ativo ?? true,
    };
    await this.buildings.save(building);
    return building;
  }
}
