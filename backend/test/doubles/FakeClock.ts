import type { IClock } from '../../src/providers/IClock';

export class FakeClock implements IClock {
  constructor(private current = new Date('2026-10-20T14:00:00Z')) {}

  now() {
    return new Date(this.current);
  }

  set(date: Date) {
    this.current = date;
  }

  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms);
  }
}
