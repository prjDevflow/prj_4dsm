import type { IClock } from '../../providers/IClock';

export class SystemClock implements IClock {
  now() {
    return new Date();
  }
}
