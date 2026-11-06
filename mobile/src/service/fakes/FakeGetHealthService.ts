import type { Health } from '@/lib/types/health';
import { ApiError } from '../ApiError';
import type { IGetHealthService } from '../IHealthService';
import { sampleHealth } from './sampleData';

export class FakeGetHealthService implements IGetHealthService {
  calls = 0;

  constructor(private result: Health | ApiError = sampleHealth) {}

  willFail(error: ApiError) {
    this.result = error;
  }

  willReturn(health: Health) {
    this.result = health;
  }

  async exec(): Promise<Health> {
    this.calls += 1;
    if (this.result instanceof ApiError) throw this.result;
    return this.result;
  }
}
