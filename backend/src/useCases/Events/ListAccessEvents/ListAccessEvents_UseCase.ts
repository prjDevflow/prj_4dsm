import type {
  AccessEventDetails,
  IAccessEventRepository,
} from '../../../repositories/IAccessEventRepository';
import type { Page } from '../../../shared/pagination';
import type { IListAccessEventsDTO } from './ListAccessEvents_DTO';

export class ListAccessEventsUseCase {
  constructor(private events: IAccessEventRepository) {}

  async execute(_input: IListAccessEventsDTO): Promise<Page<AccessEventDetails>> {
    void this.events;
    throw new Error('não implementado');
  }
}
