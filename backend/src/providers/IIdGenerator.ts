export interface IIdGenerator {
  /** A new UUID v4 as text. */
  next(): string;
}
