import type {
  AccessEventDetails,
  IAccessEventRepository,
} from '../../../repositories/IAccessEventRepository';
import type { Page } from '../../../shared/pagination';
import type { IListMyAccessEventsDTO } from './ListMyAccessEvents_DTO';

export class ListMyAccessEventsUseCase {
  constructor(private events: IAccessEventRepository) {}

  async execute(
    _userId: string,
    _input: IListMyAccessEventsDTO,
  ): Promise<Page<AccessEventDetails>> {
    void this.events;
    throw new Error('não implementado');
  }
}
