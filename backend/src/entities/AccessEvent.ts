import type { DenialReason } from './DenialReason';

export type AccessMethod = 'QR' | 'NFC';
export type AccessResult = 'AUTORIZADO' | 'NEGADO';

/** One row per access attempt, approved or denied. Insert-only. */
export interface AccessEvent {
  id: string;
  ocorridoEm: Date;
  terminalId: string | null;
  accessPointId: string | null;
  usuarioId: string | null;
  authorizationId: string | null;
  metodo: AccessMethod;
  resultado: AccessResult;
  /** Denial reason code (see doc 03, section 4.4). */
  motivo: string | null;
  distanciaM: number | null;
  clientEventId: string | null;
  detalhes: Record<string, unknown> | null;
}

/** What the caller knows about the attempt. `detalhes` is built from the last two fields only. */
export interface NewAccessEventBase {
  id: string;
  ocorridoEm: Date;
  metodo: AccessMethod;
  terminalId?: string | null;
  accessPointId?: string | null;
  usuarioId?: string | null;
  authorizationId?: string | null;
  distanciaM?: number | null;
  /** GPS accuracy reported by the phone, in meters. */
  precisaoMetros?: number | null;
  /** SHA-256 of an unknown credential. Only a short prefix is kept. */
  credencialHash?: string | null;
}

export type NewApprovedEvent = NewAccessEventBase;

export interface NewDeniedEvent extends NewAccessEventBase {
  motivo: DenialReason;
}

/** How much of an unknown credential's hash is kept: enough to correlate attempts, not to look it up. */
export const CREDENTIAL_HASH_PREFIX_LENGTH = 8;

/** Built from named fields only, so nothing else the caller holds (token, key, password) can leak in. */
function buildDetails(input: NewAccessEventBase): Record<string, unknown> | null {
  const details: Record<string, unknown> = {};
  if (input.precisaoMetros != null) details.precisaoMetros = input.precisaoMetros;
  if (input.credencialHash != null) {
    details.credencialHashPrefixo = input.credencialHash.slice(0, CREDENTIAL_HASH_PREFIX_LENGTH);
  }
  return Object.keys(details).length > 0 ? details : null;
}

function build(
  input: NewAccessEventBase,
  outcome: Pick<AccessEvent, 'resultado' | 'motivo'>,
): AccessEvent {
  return {
    id: input.id,
    ocorridoEm: input.ocorridoEm,
    terminalId: input.terminalId ?? null,
    accessPointId: input.accessPointId ?? null,
    usuarioId: input.usuarioId ?? null,
    authorizationId: input.authorizationId ?? null,
    metodo: input.metodo,
    ...outcome,
    distanciaM: input.distanciaM ?? null,
    clientEventId: null,
    detalhes: buildDetails(input),
  };
}

export const AccessEvent = {
  approved(input: NewApprovedEvent): AccessEvent {
    return build(input, { resultado: 'AUTORIZADO', motivo: null });
  },

  denied(input: NewDeniedEvent): AccessEvent {
    return build(input, { resultado: 'NEGADO', motivo: input.motivo });
  },
};
