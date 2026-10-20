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
