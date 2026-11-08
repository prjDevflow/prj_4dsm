import type { AccessEvent } from '../../src/entities/AccessEvent';

/** A valid approved QR event; tests override only the fields that matter to the case. */
export function makeAccessEvent(overrides: Partial<AccessEvent> = {}): AccessEvent {
  return {
    id: '00000000-0000-4000-8000-0000000000e9',
    ocorridoEm: new Date('2026-10-20T14:00:00Z'),
    terminalId: null,
    accessPointId: null,
    usuarioId: null,
    authorizationId: null,
    metodo: 'QR',
    resultado: 'AUTORIZADO',
    motivo: null,
    distanciaM: null,
    clientEventId: null,
    detalhes: null,
    ...overrides,
  };
}
