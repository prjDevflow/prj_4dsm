import type { AccessEvent } from '../entities/AccessEvent';

export interface RecentNfcQuery {
  terminalId: string;
  /** Normalized; matched whole, never by prefix. */
  uid: string;
  /** Exclusive: an event that happened exactly at `since` is not recent. */
  since: Date;
}

/**
 * Events are never edited or removed, so the port has no `update` and no `delete`. The queries of the
 * history (B18) are added by the step that needs them.
 */
export interface IAccessEventRepository {
  append(event: AccessEvent): Promise<void>;
  /** The event stored under this `clientEventId` (the `Idempotency-Key` of an NFC read), or null. */
  findByClientEventId(clientEventId: string): Promise<AccessEvent | null>;
  /** The newest `NFC` event of this terminal for exactly this UID after `since`, or null (the debounce). */
  findRecentNfc(query: RecentNfcQuery): Promise<AccessEvent | null>;
}
