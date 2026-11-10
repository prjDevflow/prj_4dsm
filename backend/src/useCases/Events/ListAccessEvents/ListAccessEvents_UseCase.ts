import type {
  AccessEventDetails,
  IAccessEventRepository,
} from '../../../repositories/IAccessEventRepository';
import type { Page } from '../../../shared/pagination';
import { toAccessEventPage } from '../accessEventPage';
import type { IListAccessEventsDTO } from './ListAccessEvents_DTO';

export class ListAccessEventsUseCase {
  constructor(private events: IAccessEventRepository) {}

  async execute(input: IListAccessEventsDTO): Promise<Page<AccessEventDetails>> {
    const result = await this.events.list(input);
    return toAccessEventPage(result, input);
  }
}
