import type { Health } from '@/lib/types/health';

// Same values as the examples in backend/openapi.yaml.
export const sampleHealth: Health = {
  status: 'ok',
  version: '0.1.0',
  time: '2026-10-16T12:00:00.000Z',
  db: 'up',
};
