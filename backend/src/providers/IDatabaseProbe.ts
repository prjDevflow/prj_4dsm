export interface IDatabaseProbe {
  /** Resolves true when the database answers; false (or a rejection) when it does not. */
  ping(): Promise<boolean>;
}
