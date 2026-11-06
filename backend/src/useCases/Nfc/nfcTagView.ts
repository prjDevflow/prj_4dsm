import type { NfcTagDetails } from '../../repositories/INfcTagRepository';

/** The tag as the API exposes it, with the person it belongs to. */
export interface NfcTagView {
  id: string;
  usuario: { id: string; nome: string };
  uid: string;
  descricao: string | null;
  ativa: boolean;
  criadaEm: Date;
}

export const toNfcTagView = ({ tag, usuario }: NfcTagDetails): NfcTagView => ({
  id: tag.id,
  usuario,
  uid: tag.uid,
  descricao: tag.descricao,
  ativa: tag.ativa,
  criadaEm: tag.criadaEm,
});
