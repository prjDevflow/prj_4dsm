import type { IDatabaseProbe } from '../../src/providers/IDatabaseProbe';

export class FakeDatabaseProbe implements IDatabaseProbe {
  constructor(private behavior: 'up' | 'down' | 'throws' = 'up') {}

  async ping() {
    if (this.behavior === 'throws') throw new Error('conexão recusada');
    return this.behavior === 'up';
  }
}
