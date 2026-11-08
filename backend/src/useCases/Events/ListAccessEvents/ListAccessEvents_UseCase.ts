import type {
  AccessEventDetails,
  IAccessEventRepository,
} from '../../../repositories/IAccessEventRepository';
import type { Page } from '../../../shared/pagination';
import type { IListAccessEventsDTO } from './ListAccessEvents_DTO';

export class ListAccessEventsUseCase {
  constructor(private events: IAccessEventRepository) {}

  async execute(input: IListAccessEventsDTO): Promise<Page<AccessEventDetails>> {
    const result = await this.events.list(input);
    return { data: result.items, page: input.page, pageSize: input.pageSize, total: result.total };
  }
}
