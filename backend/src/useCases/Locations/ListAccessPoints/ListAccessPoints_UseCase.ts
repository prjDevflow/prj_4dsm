import type { AccessPoint } from '../../../entities/AccessPoint';
import type { IAccessPointRepository } from '../../../repositories/IAccessPointRepository';
import type { Page } from '../../../shared/pagination';
import type { IListAccessPointsDTO } from './ListAccessPoints_DTO';

export class ListAccessPointsUseCase {
  constructor(private accessPoints: IAccessPointRepository) {}

  async execute(_input: IListAccessPointsDTO): Promise<Page<AccessPoint>> {
    throw new Error('not implemented');
  }
}
