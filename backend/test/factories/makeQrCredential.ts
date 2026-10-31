import type { QrCredential } from '../../src/entities/QrCredential';

/** A valid credential issued at 14:00:00Z and valid for 15 s, not yet used. */
export function makeQrCredential(overrides: Partial<QrCredential> = {}): QrCredential {
  const emitidoEm = overrides.emitidoEm ?? new Date('2026-10-20T14:00:00Z');
  return {
    id: '00000000-0000-4000-8000-0000000000d1',
    terminalId: '00000000-0000-4000-8000-0000000000a9',
    tokenHash: 'a'.repeat(64),
    emitidoEm,
    expiraEm: new Date(emitidoEm.getTime() + 15_000),
    consumidoEm: null,
    consumidoPorId: null,
    ...overrides,
  };
}
