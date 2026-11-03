import type { AccessEvent } from '../entities/AccessEvent';

/**
 * Events are never edited or removed, so the port has no `update` and no `delete`. The queries of the
 * history (B17, B18) are added by the steps that need them.
 */
export interface IAccessEventRepository {
  append(event: AccessEvent): Promise<void>;
}
