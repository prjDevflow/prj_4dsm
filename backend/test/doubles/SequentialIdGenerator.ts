import type { IIdGenerator } from '../../src/providers/IIdGenerator';

/** Predictable ids: ...-000000000001, ...-000000000002 and so on. */
export class SequentialIdGenerator implements IIdGenerator {
  private count = 0;

  next() {
    this.count += 1;
    return `00000000-0000-4000-8000-${String(this.count).padStart(12, '0')}`;
  }
}
