export interface QrCredential {
  id: string;
  terminalId: string;
  /** SHA-256 (hex) of the token; the token itself is never stored. */
  tokenHash: string;
  emitidoEm: Date;
  expiraEm: Date;
  consumidoEm: Date | null;
  consumidoPorId: string | null;
}
