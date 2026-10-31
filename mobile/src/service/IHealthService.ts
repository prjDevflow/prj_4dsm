import type { Health } from '@/lib/types/health';

export interface IGetHealthService {
  exec: () => Promise<Health>;
}
