import type { AccessPoint } from '../../../entities/AccessPoint';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { IAccessPointRepository } from '../../../repositories/IAccessPointRepository';
import type { IBuildingRepository } from '../../../repositories/IBuildingRepository';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import type { ICreateAccessPointDTO } from './CreateAccessPoint_DTO';

export class CreateAccessPointUseCase {
  constructor(
    private buildings: IBuildingRepository,
    private accessPoints: IAccessPointRepository,
    private ids: IIdGenerator,
  ) {}

  async execute(input: ICreateAccessPointDTO): Promise<AccessPoint> {
    const building = await this.buildings.findById(input.buildingId);
    if (!building) throw new NotFoundError('Edifício não encontrado');
    if (!building.ativo) {
      throw new ValidationError('Dados inválidos', [
        { field: 'buildingId', message: 'Edifício inativo' },
      ]);
    }

    const accessPoint: AccessPoint = {
      id: this.ids.next(),
      buildingId: input.buildingId,
      tipo: input.tipo,
      nome: input.nome,
      identificacao: input.identificacao,
      latitude: input.latitude,
      longitude: input.longitude,
      ativo: input.ativo ?? true,
    };
    // `save` rejects a repeated identification in the building (409), even between simultaneous requests.
    await this.accessPoints.save(accessPoint);
    return accessPoint;
  }
}
