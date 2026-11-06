import type { Building } from '../../src/entities/Building';

/** A valid active building; tests override only the fields that matter to the case. */
export function makeBuilding(overrides: Partial<Building> = {}): Building {
  return {
    id: '00000000-0000-4000-8000-0000000000f1',
    nome: 'Edifício Central',
    endereco: 'Rua das Acácias, 120',
    latitude: -23.30512,
    longitude: -45.96551,
    ativo: true,
    ...overrides,
  };
}
