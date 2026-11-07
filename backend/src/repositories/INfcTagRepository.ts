import type { NfcTag } from '../entities/NfcTag';

export interface INfcTagRepository {
  /**
   * Inserts a new tag. A UID that is already stored throws a 409 `TAG_JA_CADASTRADA`; the database
   * decides, so two simultaneous requests with the same UID cannot both win.
   */
  save(tag: NfcTag): Promise<void>;
}
