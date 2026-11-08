import type { AccessPointType } from '../entities/AccessPoint';
import type { AccessEvent, AccessMethod, AccessResult } from '../entities/AccessEvent';
import type { DenialReason } from '../entities/DenialReason';
import type { UserProfile } from '../entities/User';

export interface AccessEventListFilter {
  usuarioId?: string;
  accessPointId?: string;
  terminalId?: string;
  metodo?: AccessMethod;
  resultado?: AccessResult;
  motivo?: DenialReason;
  /** Inclusive: an event that happened exactly at `de` is listed. */
  de?: Date;
  /** Inclusive: an event that happened exactly at `ate` is listed. */
  ate?: Date;
  /** 1-based. */
  page: number;
  pageSize: number;
}

/**
 * One event with the people and the place already resolved (read model). Only what the history shows:
 * `detalhes` (UID, hash prefix) and `clientEventId` (the idempotency key) stay inside the repository.
 */
export interface AccessEventDetails {
  id: string;
  ocorridoEm: Date;
  metodo: AccessMethod;
  resultado: AccessResult;
  motivo: string | null;
  distanciaM: number | null;
  authorizationId: string | null;
  /** Null when the attempt did not identify a person (an unknown tag or QR credential). */
  usuario: { id: string; nome: string; perfil: UserProfile } | null;
  /** Null when the attempt did not reach a terminal (an unknown QR credential). */
  local: {
    id: string;
    nome: string;
    tipo: AccessPointType;
    edificio: { id: string; nome: string };
  } | null;
  terminal: { id: string; nome: string } | null;
}

export interface AccessEventListResult {
  items: AccessEventDetails[];
  /** Matches before pagination. */
  total: number;
}

export interface RecentNfcQuery {
  terminalId: string;
  /** Normalized; matched whole, never by prefix. */
  uid: string;
  /** Exclusive: an event that happened exactly at `since` is not recent. */
  since: Date;
}

/** Events are never edited or removed, so the port has no `update` and no `delete`. */
export interface IAccessEventRepository {
  append(event: AccessEvent): Promise<void>;
  /** Newest first (`ocorridoEm`, then `id`, so a page never repeats or skips an event). */
  list(filter: AccessEventListFilter): Promise<AccessEventListResult>;
  /** The event stored under this `clientEventId` (the `Idempotency-Key` of an NFC read), or null. */
  findByClientEventId(clientEventId: string): Promise<AccessEvent | null>;
  /** The newest `NFC` event of this terminal for exactly this UID after `since`, or null (the debounce). */
  findRecentNfc(query: RecentNfcQuery): Promise<AccessEvent | null>;
}
