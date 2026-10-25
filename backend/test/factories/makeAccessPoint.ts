import type { AccessPoint } from '../../src/entities/AccessPoint';

/** A valid active access point of the default test building. */
export function makeAccessPoint(overrides: Partial<AccessPoint> = {}): AccessPoint {
  return {
    id: '00000000-0000-4000-8000-0000000000c1',
    buildingId: '00000000-0000-4000-8000-0000000000f1',
    tipo: 'CATRACA',
    nome: 'Catraca Social',
    identificacao: 'CAT-01',
    latitude: -23.30512,
    longitude: -45.96551,
    ativo: true,
    ...overrides,
  };
}
