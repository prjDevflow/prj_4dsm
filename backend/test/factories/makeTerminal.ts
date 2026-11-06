import type { Terminal } from '../../src/entities/Terminal';

/** A valid active terminal that has never made contact. */
export function makeTerminal(overrides: Partial<Terminal> = {}): Terminal {
  return {
    id: '00000000-0000-4000-8000-0000000000a9',
    accessPointId: '00000000-0000-4000-8000-0000000000c1',
    nome: 'Terminal Social',
    apiKeyHash: 'sha256:chave-de-teste',
    ativo: true,
    ultimoContatoEm: null,
    ultimaLat: null,
    ultimaLon: null,
    gpsFix: false,
    gpsSimulado: false,
    firmware: null,
    rssi: null,
    modoCadastroUsuarioId: null,
    modoCadastroAte: null,
    ...overrides,
  };
}
