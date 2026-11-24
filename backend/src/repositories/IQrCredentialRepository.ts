import type { QrCredential } from '../entities/QrCredential';

export interface IQrCredentialRepository {
  /**
   * Stores the credential only if the terminal has no credential issued after `previousIssueUntil`
   * (an issue exactly at that instant still lets the new one pass). The check and the insert are one
   * step, serialized per terminal, so two simultaneous requests cannot both win. False means nothing
   * was written: the terminal asked again too soon.
   */
  saveIfIdle(credential: QrCredential, previousIssueUntil: Date): Promise<boolean>;
  findByTokenHash(tokenHash: string): Promise<QrCredential | null>;
  /** Deletes the credentials whose `expiraEm` is before `cutoff` (strictly). Returns how many. */
  deleteExpiredBefore(cutoff: Date): Promise<number>;
}
