import type { NfcTag } from '../entities/NfcTag';

export interface NfcTagListFilter {
  usuarioId?: string;
  ativa?: boolean;
  /** 1-based. */
  page: number;
  pageSize: number;
}

export interface NfcTagListResult {
  items: NfcTag[];
  /** Matches before pagination. */
  total: number;
}

export interface INfcTagRepository {
  /**
   * Inserts a new tag. A UID that is already stored throws a 409 `TAG_JA_CADASTRADA`; the database
   * decides, so two simultaneous requests with the same UID cannot both win.
   */
  save(tag: NfcTag): Promise<void>;
  /**
   * Turns a tag on or off and writes nothing else. The tag after the change, or null when it does not exist.
   */
  updateStatus(id: string, ativa: boolean): Promise<NfcTag | null>;
  /** The tag with this UID, active or not, or null. The UID must already be normalized. */
  findByUid(uid: string): Promise<NfcTag | null>;
  /** Newest first (`criadaEm`, then `id`, both descending, so a page never repeats or skips a tag). */
  list(filter: NfcTagListFilter): Promise<NfcTagListResult>;
}
