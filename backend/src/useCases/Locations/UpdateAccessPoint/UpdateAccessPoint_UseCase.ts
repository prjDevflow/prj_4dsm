import type { AccessPoint } from '../../../entities/AccessPoint';
import type { IClock } from '../../../providers/IClock';
import type { IAccessPointRepository } from '../../../repositories/IAccessPointRepository';
import type { IAuthorizationRepository } from '../../../repositories/IAuthorizationRepository';
import type { IBuildingRepository } from '../../../repositories/IBuildingRepository';
import type { IUpdateAccessPointDTO } from './UpdateAccessPoint_DTO';

export class UpdateAccessPointUseCase {
  constructor(
    private buildings: IBuildingRepository,
    private accessPoints: IAccessPointRepository,
    private authorizations: IAuthorizationRepository,
    private clock: IClock,
  ) {}

  async execute(_id: string, _input: IUpdateAccessPointDTO): Promise<AccessPoint> {
    throw new Error('not implemented');
  }
}
