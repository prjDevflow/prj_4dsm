import type {
  AccessEventDetails,
  AccessEventListResult,
} from '../../repositories/IAccessEventRepository';
import type { Page } from '../../shared/pagination';

/** The paginated body of both history routes: the events as the repository resolved them. */
export function toAccessEventPage(
  result: AccessEventListResult,
  paging: { page: number; pageSize: number },
): Page<AccessEventDetails> {
  return {
    data: result.items,
    page: paging.page,
    pageSize: paging.pageSize,
    total: result.total,
  };
}
