import type { AccessPoint } from '../../../entities/AccessPoint';
import type { IAccessPointRepository } from '../../../repositories/IAccessPointRepository';
import type { Page } from '../../../shared/pagination';
import type { IListAccessPointsDTO } from './ListAccessPoints_DTO';

export class ListAccessPointsUseCase {
  constructor(private accessPoints: IAccessPointRepository) {}

  async execute(input: IListAccessPointsDTO): Promise<Page<AccessPoint>> {
    const { items, total } = await this.accessPoints.list(input);
    return { data: items, page: input.page, pageSize: input.pageSize, total };
  }
}
