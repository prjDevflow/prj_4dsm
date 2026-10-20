import type { Authorization } from '../../src/entities/Authorization';

/** A valid authorization; tests override only the fields that matter to the case. */
export function makeAuthorization(overrides: Partial<Authorization> = {}): Authorization {
  return {
    id: '00000000-0000-4000-8000-0000000000a1',
    usuarioId: '00000000-0000-4000-8000-0000000000b1',
    accessPointId: '00000000-0000-4000-8000-0000000000c1',
    dataInicio: '2026-10-01',
    dataFim: '2026-10-31',
    horaInicio: '08:00',
    horaFim: '18:00',
    usosPermitidos: 3,
    usosRealizados: 0,
    situacao: 'ATIVA',
    criadoPorId: '00000000-0000-4000-8000-0000000000d1',
    criadoEm: new Date('2026-09-30T12:00:00Z'),
    canceladoPorId: null,
    canceladoEm: null,
    motivoCancelamento: null,
    ...overrides,
  };
}
