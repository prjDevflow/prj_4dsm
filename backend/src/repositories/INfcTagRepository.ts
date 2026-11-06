import type { NfcTag } from '../entities/NfcTag';

/** A tag with its user already resolved (read model). */
export interface NfcTagDetails {
  tag: NfcTag;
  usuario: { id: string; nome: string };
}

export interface NfcTagListFilter {
  usuarioId?: string;
  ativa?: boolean;
  /** 1-based. */
  page: number;
  pageSize: number;
}

export interface NfcTagListResult {
  items: NfcTagDetails[];
  /** Matches before pagination. */
  total: number;
}

export interface INfcTagRepository {
  /**
   * Inserts a new tag; the user must exist. A repeated UID throws a 409 `TAG_JA_CADASTRADA`: the database
   * decides, so two simultaneous requests cannot both win.
   */
  save(tag: NfcTag): Promise<void>;
  /** Expects the UID already normalized. Finds inactive tags too. */
  findByUid(uid: string): Promise<NfcTag | null>;
  /** Newest first; the id breaks ties, so a page never repeats or skips a tag. */
  list(filter: NfcTagListFilter): Promise<NfcTagListResult>;
  /** Changes only `ativa`. Null when the tag does not exist. The id must already be validated. */
  update(id: string, changes: { ativa: boolean }): Promise<NfcTagDetails | null>;
}
