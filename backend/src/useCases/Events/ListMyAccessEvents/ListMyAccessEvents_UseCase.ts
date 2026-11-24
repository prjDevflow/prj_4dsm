import type {
  AccessEventDetails,
  IAccessEventRepository,
} from '../../../repositories/IAccessEventRepository';
import type { Page } from '../../../shared/pagination';
import { toAccessEventPage } from '../accessEventPage';
import type { IListMyAccessEventsDTO } from './ListMyAccessEvents_DTO';

export class ListMyAccessEventsUseCase {
  constructor(private events: IAccessEventRepository) {}

  async execute(userId: string, input: IListMyAccessEventsDTO): Promise<Page<AccessEventDetails>> {
    // The user comes from the token and goes last, so nothing in the input can replace it.
    const result = await this.events.list({ ...input, usuarioId: userId });
    return toAccessEventPage(result, input);
  }
}
