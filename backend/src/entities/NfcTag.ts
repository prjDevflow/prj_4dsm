export interface NfcTag {
  id: string;
  usuarioId: string;
  /** Hexadecimal, uppercase, no separators, 8 to 20 characters. */
  uid: string;
  descricao: string | null;
  ativa: boolean;
  criadaEm: Date;
}
