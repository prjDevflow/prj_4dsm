import { randomUUID } from 'node:crypto';
import type { IIdGenerator } from '../../providers/IIdGenerator';

export class UuidGenerator implements IIdGenerator {
  next() {
    return randomUUID();
  }
}
