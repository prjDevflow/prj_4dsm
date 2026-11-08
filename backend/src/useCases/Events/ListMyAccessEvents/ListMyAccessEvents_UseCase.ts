import type {
  AccessEventDetails,
  IAccessEventRepository,
} from '../../../repositories/IAccessEventRepository';
import type { Page } from '../../../shared/pagination';
import type { IListMyAccessEventsDTO } from './ListMyAccessEvents_DTO';

export class ListMyAccessEventsUseCase {
  constructor(private events: IAccessEventRepository) {}

  async execute(userId: string, input: IListMyAccessEventsDTO): Promise<Page<AccessEventDetails>> {
    // The user comes from the token and goes last, so nothing in the input can replace it.
    const result = await this.events.list({ ...input, usuarioId: userId });
    return { data: result.items, page: input.page, pageSize: input.pageSize, total: result.total };
  }
}
