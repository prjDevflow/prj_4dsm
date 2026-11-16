// TagNfc and ModoCadastro of backend/openapi.yaml (B16).

export interface TagNfc {
  id: string;
  usuarioId: string;
  /** Normalized: capitals, no separators. */
  uid: string;
  descricao: string | null;
  ativa: boolean;
  criadaEm: string;
}

export type CreateNfcTagBody = { usuarioId: string; uid: string; descricao?: string };

export type ListNfcTagsParams = {
  usuarioId?: string;
  ativa?: boolean;
  page: number;
  pageSize: number;
};

/** For ENROLL_MODE_SECONDS (60 by default), the next tag read by the terminal goes to this person. */
export interface ModoCadastro {
  terminalId: string;
  usuarioId: string;
  expiraEm: string;
}
