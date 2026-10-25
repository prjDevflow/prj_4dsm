import type { AccessPoint } from '../../../entities/AccessPoint';
import type { IIdGenerator } from '../../../providers/IIdGenerator';
import type { IAccessPointRepository } from '../../../repositories/IAccessPointRepository';
import type { IBuildingRepository } from '../../../repositories/IBuildingRepository';
import type { ICreateAccessPointDTO } from './CreateAccessPoint_DTO';

export class CreateAccessPointUseCase {
  constructor(
    private buildings: IBuildingRepository,
    private accessPoints: IAccessPointRepository,
    private ids: IIdGenerator,
  ) {}

  async execute(_input: ICreateAccessPointDTO): Promise<AccessPoint> {
    throw new Error('not implemented');
  }
}
