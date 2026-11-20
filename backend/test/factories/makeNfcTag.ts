import type { NfcTag } from '../../src/entities/NfcTag';

/** A valid active tag; tests override only the fields that matter to the case. */
export function makeNfcTag(overrides: Partial<NfcTag> = {}): NfcTag {
  return {
    id: '00000000-0000-4000-8000-0000000000f1',
    usuarioId: '00000000-0000-4000-8000-0000000000e1',
    uid: '04A1B2C3',
    descricao: null,
    ativa: true,
    criadaEm: new Date('2026-10-01T12:00:00Z'),
    ...overrides,
  };
}
